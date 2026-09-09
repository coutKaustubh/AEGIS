from rest_framework import serializers
from .models import *


class EngineeringSerializer(serializers.ModelSerializer):
    class Meta:
        fields = "__all__"
        read_only_fields = ("id", "created_by", "updated_by", "created_at", "updated_at")


class ProjectSerializer(EngineeringSerializer):
    class Meta(EngineeringSerializer.Meta):
        model = EngineeringProject


class AreaSerializer(EngineeringSerializer):
    class Meta(EngineeringSerializer.Meta):
        model = EngineeringArea


class EquipmentSerializer(EngineeringSerializer):
    class Meta(EngineeringSerializer.Meta):
        model = EngineeringEquipment


class LineSerializer(EngineeringSerializer):
    class Meta(EngineeringSerializer.Meta):
        model = EngineeringLine


class ValveSerializer(EngineeringSerializer):
    class Meta(EngineeringSerializer.Meta):
        model = EngineeringValve


class InstrumentSerializer(EngineeringSerializer):
    class Meta(EngineeringSerializer.Meta):
        model = EngineeringInstrument


class StreamSerializer(EngineeringSerializer):
    class Meta(EngineeringSerializer.Meta):
        model = EngineeringStream


class DiagramSerializer(EngineeringSerializer):
    class Meta(EngineeringSerializer.Meta):
        model = EngineeringDiagram


class CalculationSerializer(EngineeringSerializer):
    class Meta(EngineeringSerializer.Meta):
        model = EngineeringCalculation


class RevisionSerializer(EngineeringSerializer):
    class Meta(EngineeringSerializer.Meta):
        model = EngineeringRevision


class HazopStudySerializer(EngineeringSerializer):
    class Meta(EngineeringSerializer.Meta):
        model = HazopStudy


class HazopNodeSerializer(EngineeringSerializer):
    class Meta(EngineeringSerializer.Meta):
        model = HazopNode


class HazopItemSerializer(EngineeringSerializer):
    class Meta(EngineeringSerializer.Meta):
        model = HazopItem


class MocSerializer(EngineeringSerializer):
    class Meta(EngineeringSerializer.Meta):
        model = MocRequest


class ValidationSerializer(serializers.ModelSerializer):
    class Meta:
        model = EngineeringValidationResult
        fields = "__all__"


class CalculationRequestSerializer(serializers.Serializer):
    project_id = serializers.UUIDField()
    calculation_type = serializers.ChoiceField(choices=["pipe_sizing", "pressure_drop", "pump_sizing", "heat_exchanger"])
    title = serializers.CharField(max_length=200)
    inputs = serializers.JSONField()
    assumptions = serializers.JSONField(required=False, default=dict)
    calculation_number = serializers.CharField(max_length=100, required=False)
