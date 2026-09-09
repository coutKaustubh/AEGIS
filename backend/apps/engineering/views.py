import json
import time
from pathlib import Path
from uuid import UUID

from django.conf import settings
from django.db import transaction
from django.db.models import Q
from django.http import FileResponse, StreamingHttpResponse
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.renderers import BaseRenderer
from rest_framework.decorators import renderer_classes

from .calculations import CALCULATORS
from .models import *
from .serializers import *
from .validation import validate_diagram


class EventStreamRenderer(BaseRenderer):
    media_type = "text/event-stream"
    format = "event-stream"
    charset = "utf-8"

    def render(self, data, accepted_media_type=None, renderer_context=None):
        return data


def user_uuid(user):
    return user.unique_id


def event_type_for(action_name, obj):
    kind = obj.__class__.__name__.replace("Engineering", "").replace("Hazop", "hazop_").replace("Moc", "moc_").lower() if obj else "engineering"
    verb = {"created": "created", "updated": "updated", "project_created": "created", "project_updated": "updated", "diagram_validated": "validation.completed", "calculation_created": "calculation.completed", "moc_transition": "workflow.transitioned", "engineering_report_generated": "artifact.generated"}.get(action_name, action_name)
    return verb if "." in verb else f"{kind}.{verb}"


def audit(project, user, action_name, obj=None, old=None, new=None, metadata=None):
    meta = metadata or {}
    safe = lambda value: json.loads(json.dumps(value, default=str)) if value is not None else None
    EngineeringAuditLog.objects.create(project=project, user_id=user_uuid(user), action=action_name, event_type=event_type_for(action_name, obj), object_type=obj.__class__.__name__ if obj else "", object_id=getattr(obj, "id", None), old_values=safe(old), new_values=safe(new), metadata=safe(meta) or {}, revision=getattr(project, "current_revision", ""))


class OwnedViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = EngineeringSerializer
    project_field = "project"

    def get_queryset(self):
        qs = self.queryset.filter(**{f"{self.project_field}__created_by": user_uuid(self.request.user)})
        project = self.request.query_params.get("project")
        if project: qs = qs.filter(**{f"{self.project_field}_id": project})
        search = self.request.query_params.get("q")
        if search and hasattr(self.queryset.model, "tag"): qs = qs.filter(tag__icontains=search)
        if search and hasattr(self.queryset.model, "line_number"): qs = qs.filter(line_number__icontains=search)
        requested_status = self.request.query_params.get("status")
        if requested_status and hasattr(self.queryset.model, "status"): qs = qs.filter(status=requested_status)
        ordering = self.request.query_params.get("ordering")
        if ordering and ordering.lstrip("-") in {field.name for field in self.queryset.model._meta.fields}: qs = qs.order_by(ordering)
        return qs

    def perform_create(self, serializer):
        data = serializer.validated_data
        project = data.get(self.project_field)
        if project and project.created_by != user_uuid(self.request.user):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Project access denied")
        obj = serializer.save(created_by=user_uuid(self.request.user), updated_by=user_uuid(self.request.user))
        audit(project, self.request.user, "created", obj, new=serializer.data)

    def perform_update(self, serializer):
        project = getattr(serializer.instance, self.project_field)
        old = {field.name: getattr(serializer.instance, field.name) for field in serializer.instance._meta.fields if field.name not in {"created_at", "updated_at"}}
        obj = serializer.save(updated_by=user_uuid(self.request.user))
        audit(project, self.request.user, "updated", obj, old=old, new=serializer.data)
        if isinstance(obj, (EngineeringEquipment, EngineeringLine, EngineeringStream)):
            stale = EngineeringCalculation.objects.filter(project=project).exclude(status="superseded").update(status="stale")
            if stale:
                audit(project, self.request.user, "calculation_invalidated", obj, metadata={"reason": "source engineering data changed", "count": stale})


class ProjectViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ProjectSerializer
    queryset = EngineeringProject.objects.all()

    def get_queryset(self): return self.queryset.filter(created_by=user_uuid(self.request.user))
    def perform_create(self, serializer):
        obj = serializer.save(created_by=user_uuid(self.request.user), updated_by=user_uuid(self.request.user))
        audit(obj, self.request.user, "project_created", obj, new=serializer.data)
    def perform_update(self, serializer):
        obj = serializer.save(updated_by=user_uuid(self.request.user))
        audit(obj, self.request.user, "project_updated", obj, new=serializer.data)
    @action(detail=True, methods=["get"])
    def summary(self, request, pk=None):
        p = self.get_object()
        return Response({"project": ProjectSerializer(p).data, "counts": {"equipment": p.equipment.count(), "lines": p.lines.count(), "diagrams": p.diagrams.count(), "calculations": p.calculations.count(), "hazop": p.hazop_studies.count(), "moc": p.mocs.count()}})


class AreaViewSet(OwnedViewSet):
    queryset = EngineeringArea.objects.all(); serializer_class = AreaSerializer

class EquipmentViewSet(OwnedViewSet):
    queryset = EngineeringEquipment.objects.all(); serializer_class = EquipmentSerializer

class LineViewSet(OwnedViewSet):
    queryset = EngineeringLine.objects.all(); serializer_class = LineSerializer

class ValveViewSet(OwnedViewSet):
    queryset = EngineeringValve.objects.all(); serializer_class = ValveSerializer

class InstrumentViewSet(OwnedViewSet):
    queryset = EngineeringInstrument.objects.all(); serializer_class = InstrumentSerializer

class StreamViewSet(OwnedViewSet):
    queryset = EngineeringStream.objects.all(); serializer_class = StreamSerializer

class DiagramViewSet(OwnedViewSet):
    queryset = EngineeringDiagram.objects.all(); serializer_class = DiagramSerializer

    @action(detail=True, methods=["post"])
    def validate(self, request, pk=None):
        diagram = self.get_object(); result = validate_diagram(diagram.canvas_data)
        record = EngineeringValidationResult.objects.create(project=diagram.project, object_type="diagram", object_id=diagram.id, validation_type="pid", status=result["status"], errors=result["errors"], warnings=result["warnings"], checked_objects=result["checked_objects"], created_by=user_uuid(request.user))
        audit(diagram.project, request.user, "diagram_validated", diagram, new=result)
        return Response({**result, "validation_id": str(record.id)})

class CalculationViewSet(OwnedViewSet):
    queryset = EngineeringCalculation.objects.all(); serializer_class = CalculationSerializer

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def calculate(request):
    serializer = CalculationRequestSerializer(data=request.data); serializer.is_valid(raise_exception=True)
    data = serializer.validated_data; project = EngineeringProject.objects.filter(id=data["project_id"], created_by=user_uuid(request.user)).first()
    if not project: return Response({"detail": "Project not found or access denied."}, status=404)
    result = CALCULATORS[data["calculation_type"]](data["inputs"])
    number = data.get("calculation_number") or f"CALC-{EngineeringCalculation.objects.filter(project=project).count()+1:03d}"
    calc = EngineeringCalculation.objects.create(project=project, calculation_number=number, calculation_type=data["calculation_type"], title=data["title"], inputs=data["inputs"], assumptions={**data.get("assumptions", {}), **result.get("assumptions", {})}, intermediate_results=result.get("intermediate", {}), results=result.get("results", {}), validation_status=result["status"], created_by=user_uuid(request.user), formula_reference="AEGIS deterministic preliminary engineering method")
    audit(project, request.user, "calculation_created", calc, new=result)
    return Response({"calculation": CalculationSerializer(calc).data, "validation": result}, status=201)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_report(request):
    project = EngineeringProject.objects.filter(id=request.data.get("project_id"), created_by=user_uuid(request.user)).first()
    if not project: return Response({"detail": "Project not found or access denied."}, status=404)
    payload = {"notice": "Preliminary engineering workflow report; requires engineer review.", "project": ProjectSerializer(project).data, "equipment": EquipmentSerializer(project.equipment.all(), many=True).data, "lines": LineSerializer(project.lines.all(), many=True).data, "calculations": CalculationSerializer(project.calculations.all(), many=True).data, "validation": ValidationSerializer(project.validation_results.all(), many=True).data, "revisions": RevisionSerializer(project.revisions.all(), many=True).data, "hazop": HazopStudySerializer(project.hazop_studies.all(), many=True).data, "moc": MocSerializer(project.mocs.all(), many=True).data}
    root = Path(settings.AI_ARTIFACT_ROOT).resolve() / "engineering_reports"; root.mkdir(parents=True, exist_ok=True)
    path = root / f"{project.project_code}_{project.current_revision}.json"; path.write_text(json.dumps(payload, default=str, indent=2), encoding="utf-8")
    audit(project, request.user, "engineering_report_generated", new={"path": str(path)})
    return Response({"name": path.name, "path": str(path), "report": payload})


class HazopStudyViewSet(OwnedViewSet):
    queryset = HazopStudy.objects.all(); serializer_class = HazopStudySerializer

class HazopNodeViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]; queryset = HazopNode.objects.all(); serializer_class = HazopNodeSerializer
    def get_queryset(self): return self.queryset.filter(study__project__created_by=user_uuid(self.request.user))
    def perform_create(self, serializer): serializer.save()

class HazopItemViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]; queryset = HazopItem.objects.all(); serializer_class = HazopItemSerializer
    def get_queryset(self): return self.queryset.filter(node__study__project__created_by=user_uuid(self.request.user))
    def perform_create(self, serializer): serializer.save(created_by=user_uuid(self.request.user))

class MocViewSet(OwnedViewSet):
    queryset = MocRequest.objects.all(); serializer_class = MocSerializer
    @action(detail=True, methods=["post"])
    def transition(self, request, pk=None):
        moc = self.get_object(); new_status = request.data.get("status")
        allowed = {"draft": {"engineering_review"}, "engineering_review": {"safety_review"}, "safety_review": {"approval"}, "approval": {"approved", "rejected"}, "approved": {"implemented"}, "implemented": {"closed"}, "rejected": {"draft"}}
        if new_status not in allowed.get(moc.status, set()): return Response({"detail": f"Invalid transition from {moc.status} to {new_status}."}, status=400)
        moc.status = new_status; moc.updated_by = user_uuid(request.user); moc.save(update_fields=["status", "updated_by", "updated_at"]); audit(moc.project, request.user, "moc_transition", moc, new={"status": new_status})
        return Response(MocSerializer(moc).data)

class RevisionViewSet(OwnedViewSet):
    queryset = EngineeringRevision.objects.all(); serializer_class = RevisionSerializer

    @action(detail=False, methods=["post"])
    def compare(self, request):
        left = request.data.get("left") or {}; right = request.data.get("right") or {}
        left_nodes = {str(item.get("id")): item for item in left.get("nodes", []) if item.get("id")}
        right_nodes = {str(item.get("id")): item for item in right.get("nodes", []) if item.get("id")}
        added = [right_nodes[key] for key in right_nodes.keys() - left_nodes.keys()]
        removed = [left_nodes[key] for key in left_nodes.keys() - right_nodes.keys()]
        modified = [{"before": left_nodes[key], "after": right_nodes[key]} for key in left_nodes.keys() & right_nodes.keys() if left_nodes[key] != right_nodes[key]]
        return Response({"added": added, "removed": removed, "modified": modified, "summary": {"added": len(added), "removed": len(removed), "modified": len(modified)}})

class ValidationViewSet(OwnedViewSet):
    queryset = EngineeringValidationResult.objects.all(); serializer_class = ValidationSerializer


@api_view(["GET"])
@permission_classes([IsAuthenticated])
@renderer_classes([EventStreamRenderer])
def engineering_events(request):
    """Authenticated SSE feed for live engineering changes.

    The stream is deliberately project-scoped and only exposes audit events
    owned by the authenticated project owner. The client can reconnect with
    ``after`` to avoid replaying events it already applied.
    """
    project_id = request.query_params.get("project")
    project = EngineeringProject.objects.filter(id=project_id, created_by=user_uuid(request.user)).first()
    if not project:
        return Response({"detail": "Project not found or access denied."}, status=404)
    try:
        after = UUID(request.query_params.get("after")) if request.query_params.get("after") else None
    except ValueError:
        after = None
    cursor_event = EngineeringAuditLog.objects.filter(id=after, project=project).first() if after else None

    def stream():
        cursor = cursor_event
        yield "retry: 2000\n\n"
        for _ in range(30):
            rows = EngineeringAuditLog.objects.filter(project=project).order_by("created_at", "id")
            if cursor:
                rows = rows.filter(Q(created_at__gt=cursor.created_at) | Q(created_at=cursor.created_at, id__gt=cursor.id))
            emitted = False
            for event in rows[:100]:
                cursor = event
                emitted = True
                payload = {"event_id": str(event.id), "project_id": str(project.id), "entity_type": event.object_type, "entity_id": str(event.object_id) if event.object_id else None, "revision": event.revision or project.current_revision, "actor": str(event.user_id) if event.user_id else None, "timestamp": event.created_at.isoformat(), "event_type": event.event_type, "correlation_id": str(event.correlation_id), "payload": {"action": event.action, "new_values": event.new_values or {}, "old_values": event.old_values or {}, "metadata": event.metadata or {}}}
                yield f"id: {event.id}\ndata: {json.dumps(payload, default=str)}\n\n"
            if not emitted:
                yield ": heartbeat\n\n"
            time.sleep(1)

    return StreamingHttpResponse(stream(), content_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})
