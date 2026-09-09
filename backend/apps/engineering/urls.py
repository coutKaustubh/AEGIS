from django.urls import include, path
from rest_framework.routers import DefaultRouter
from .views import *

router = DefaultRouter()
for prefix, view, name in [
    ("projects", ProjectViewSet, "project"), ("areas", AreaViewSet, "area"), ("equipment", EquipmentViewSet, "equipment"),
    ("lines", LineViewSet, "line"), ("valves", ValveViewSet, "valve"), ("instruments", InstrumentViewSet, "instrument"),
    ("streams", StreamViewSet, "stream"), ("diagrams", DiagramViewSet, "diagram"), ("calculations", CalculationViewSet, "calculation"),
    ("hazop/studies", HazopStudyViewSet, "hazop-study"), ("hazop/nodes", HazopNodeViewSet, "hazop-node"), ("hazop/items", HazopItemViewSet, "hazop-item"),
    ("moc", MocViewSet, "moc"), ("revisions", RevisionViewSet, "revision"), ("validation", ValidationViewSet, "validation")]: router.register(prefix, view, basename=name)

urlpatterns = [path("", include(router.urls)), path("calculate/", calculate), path("reports/", create_report), path("events/", engineering_events)]
