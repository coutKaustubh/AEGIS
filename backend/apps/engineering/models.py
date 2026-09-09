import uuid

from django.db import models


class EngineeringProject(models.Model):
    STATUS = [(x, x.replace("_", " ").title()) for x in ("draft", "engineering", "review", "approved", "implemented", "closed", "archived")]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project_code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    plant_name = models.CharField(max_length=200, blank=True)
    unit_name = models.CharField(max_length=200, blank=True)
    area_name = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=30, choices=STATUS, default="draft")
    current_revision = models.CharField(max_length=20, default="REV-00")
    created_by = models.UUIDField()
    updated_by = models.UUIDField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "engineering_projects"


class EngineeringArea(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(EngineeringProject, on_delete=models.CASCADE, related_name="areas")
    area_code = models.CharField(max_length=50)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        db_table = "engineering_areas"
        constraints = [models.UniqueConstraint(fields=["project", "area_code"], name="engineering_area_project_code")]


class EngineeringEquipment(models.Model):
    STATUS = [(x, x.title()) for x in ("planned", "active", "modified", "inactive", "removed")]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(EngineeringProject, on_delete=models.CASCADE, related_name="equipment")
    area = models.ForeignKey(EngineeringArea, null=True, blank=True, on_delete=models.SET_NULL, related_name="equipment")
    tag = models.CharField(max_length=100)
    name = models.CharField(max_length=200, blank=True)
    equipment_type = models.CharField(max_length=50)
    service = models.TextField(blank=True)
    status = models.CharField(max_length=30, choices=STATUS, default="active")
    design_pressure = models.DecimalField(max_digits=18, decimal_places=6, null=True, blank=True)
    design_pressure_unit = models.CharField(max_length=20, blank=True)
    operating_pressure = models.DecimalField(max_digits=18, decimal_places=6, null=True, blank=True)
    operating_pressure_unit = models.CharField(max_length=20, blank=True)
    design_temperature = models.DecimalField(max_digits=18, decimal_places=6, null=True, blank=True)
    design_temperature_unit = models.CharField(max_length=20, blank=True)
    operating_temperature = models.DecimalField(max_digits=18, decimal_places=6, null=True, blank=True)
    operating_temperature_unit = models.CharField(max_length=20, blank=True)
    material = models.CharField(max_length=100, blank=True)
    specifications = models.JSONField(default=dict)
    created_by = models.UUIDField()
    updated_by = models.UUIDField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        db_table = "engineering_equipment"
        constraints = [models.UniqueConstraint(fields=["project", "tag"], name="engineering_equipment_project_tag")]


class EngineeringLine(models.Model):
    STATUS = [(x, x.title()) for x in ("planned", "active", "modified", "inactive", "removed")]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(EngineeringProject, on_delete=models.CASCADE, related_name="lines")
    area = models.ForeignKey(EngineeringArea, null=True, blank=True, on_delete=models.SET_NULL, related_name="lines")
    line_number = models.CharField(max_length=100)
    service = models.CharField(max_length=100, blank=True)
    fluid = models.CharField(max_length=100, blank=True)
    from_equipment = models.ForeignKey(EngineeringEquipment, null=True, blank=True, on_delete=models.SET_NULL, related_name="outgoing_lines")
    to_equipment = models.ForeignKey(EngineeringEquipment, null=True, blank=True, on_delete=models.SET_NULL, related_name="incoming_lines")
    nominal_diameter = models.DecimalField(max_digits=18, decimal_places=6, null=True, blank=True)
    diameter_unit = models.CharField(max_length=20, default="mm")
    schedule = models.CharField(max_length=50, blank=True)
    piping_class = models.CharField(max_length=100, blank=True)
    material = models.CharField(max_length=100, blank=True)
    insulation_type = models.CharField(max_length=100, blank=True)
    insulation_thickness = models.DecimalField(max_digits=18, decimal_places=6, null=True, blank=True)
    corrosion_allowance = models.DecimalField(max_digits=18, decimal_places=6, null=True, blank=True)
    corrosion_allowance_unit = models.CharField(max_length=20, blank=True)
    operating_pressure = models.DecimalField(max_digits=18, decimal_places=6, null=True, blank=True)
    operating_pressure_unit = models.CharField(max_length=20, blank=True)
    design_pressure = models.DecimalField(max_digits=18, decimal_places=6, null=True, blank=True)
    design_pressure_unit = models.CharField(max_length=20, blank=True)
    operating_temperature = models.DecimalField(max_digits=18, decimal_places=6, null=True, blank=True)
    operating_temperature_unit = models.CharField(max_length=20, blank=True)
    design_temperature = models.DecimalField(max_digits=18, decimal_places=6, null=True, blank=True)
    design_temperature_unit = models.CharField(max_length=20, blank=True)
    status = models.CharField(max_length=30, choices=STATUS, default="active")
    specifications = models.JSONField(default=dict)
    created_by = models.UUIDField()
    updated_by = models.UUIDField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        db_table = "engineering_lines"
        constraints = [models.UniqueConstraint(fields=["project", "line_number"], name="engineering_line_project_number")]


class EngineeringValve(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(EngineeringProject, on_delete=models.CASCADE, related_name="valves")
    line = models.ForeignKey(EngineeringLine, null=True, blank=True, on_delete=models.SET_NULL, related_name="valves")
    tag = models.CharField(max_length=100)
    valve_type = models.CharField(max_length=50)
    nominal_diameter = models.DecimalField(max_digits=18, decimal_places=6, null=True, blank=True)
    diameter_unit = models.CharField(max_length=20, default="mm")
    pressure_rating = models.CharField(max_length=50, blank=True)
    material = models.CharField(max_length=100, blank=True)
    actuator_type = models.CharField(max_length=50, blank=True)
    fail_position = models.CharField(max_length=30, blank=True)
    status = models.CharField(max_length=30, default="active")
    specifications = models.JSONField(default=dict)
    created_by = models.UUIDField()
    updated_by = models.UUIDField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        db_table = "engineering_valves"
        constraints = [models.UniqueConstraint(fields=["project", "tag"], name="engineering_valve_project_tag")]


class EngineeringInstrument(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(EngineeringProject, on_delete=models.CASCADE, related_name="instruments")
    line = models.ForeignKey(EngineeringLine, null=True, blank=True, on_delete=models.SET_NULL, related_name="instruments")
    equipment = models.ForeignKey(EngineeringEquipment, null=True, blank=True, on_delete=models.SET_NULL, related_name="instruments")
    tag = models.CharField(max_length=100)
    instrument_type = models.CharField(max_length=50)
    measurement_type = models.CharField(max_length=50, blank=True)
    range_min = models.DecimalField(max_digits=18, decimal_places=6, null=True, blank=True)
    range_max = models.DecimalField(max_digits=18, decimal_places=6, null=True, blank=True)
    range_unit = models.CharField(max_length=20, blank=True)
    alarm_low = models.DecimalField(max_digits=18, decimal_places=6, null=True, blank=True)
    alarm_high = models.DecimalField(max_digits=18, decimal_places=6, null=True, blank=True)
    status = models.CharField(max_length=30, default="active")
    specifications = models.JSONField(default=dict)
    created_by = models.UUIDField()
    updated_by = models.UUIDField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        db_table = "engineering_instruments"
        constraints = [models.UniqueConstraint(fields=["project", "tag"], name="engineering_instrument_project_tag")]


class EngineeringStream(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(EngineeringProject, on_delete=models.CASCADE, related_name="streams")
    stream_number = models.CharField(max_length=100)
    name = models.CharField(max_length=200, blank=True)
    fluid = models.CharField(max_length=100, blank=True)
    source_equipment = models.ForeignKey(EngineeringEquipment, null=True, blank=True, on_delete=models.SET_NULL, related_name="outgoing_streams")
    destination_equipment = models.ForeignKey(EngineeringEquipment, null=True, blank=True, on_delete=models.SET_NULL, related_name="incoming_streams")
    flow_rate = models.DecimalField(max_digits=18, decimal_places=6, null=True, blank=True)
    flow_rate_unit = models.CharField(max_length=20, blank=True)
    temperature = models.DecimalField(max_digits=18, decimal_places=6, null=True, blank=True)
    temperature_unit = models.CharField(max_length=20, blank=True)
    pressure = models.DecimalField(max_digits=18, decimal_places=6, null=True, blank=True)
    pressure_unit = models.CharField(max_length=20, blank=True)
    density = models.DecimalField(max_digits=18, decimal_places=6, null=True, blank=True)
    density_unit = models.CharField(max_length=20, blank=True)
    viscosity = models.DecimalField(max_digits=18, decimal_places=6, null=True, blank=True)
    viscosity_unit = models.CharField(max_length=20, blank=True)
    phase = models.CharField(max_length=30, blank=True)
    composition = models.JSONField(default=dict)
    specifications = models.JSONField(default=dict)
    created_by = models.UUIDField()
    updated_by = models.UUIDField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        db_table = "engineering_streams"
        constraints = [models.UniqueConstraint(fields=["project", "stream_number"], name="engineering_stream_project_number")]


class EngineeringDiagram(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(EngineeringProject, on_delete=models.CASCADE, related_name="diagrams")
    area = models.ForeignKey(EngineeringArea, null=True, blank=True, on_delete=models.SET_NULL)
    diagram_number = models.CharField(max_length=100)
    name = models.CharField(max_length=200)
    diagram_type = models.CharField(max_length=20, choices=[("PFD", "PFD"), ("PID", "P&ID")])
    status = models.CharField(max_length=30, default="draft")
    canvas_data = models.JSONField(default=dict)
    created_by = models.UUIDField()
    updated_by = models.UUIDField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        db_table = "engineering_diagrams"
        constraints = [models.UniqueConstraint(fields=["project", "diagram_number"], name="engineering_diagram_project_number")]


class EngineeringCalculation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(EngineeringProject, on_delete=models.CASCADE, related_name="calculations")
    calculation_number = models.CharField(max_length=100)
    calculation_type = models.CharField(max_length=50)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=30, default="completed")
    inputs = models.JSONField(default=dict)
    assumptions = models.JSONField(default=dict)
    intermediate_results = models.JSONField(default=dict)
    results = models.JSONField(default=dict)
    formula_reference = models.TextField(blank=True)
    validation_status = models.CharField(max_length=20, null=True, blank=True)
    created_by = models.UUIDField()
    reviewed_by = models.UUIDField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    class Meta:
        db_table = "engineering_calculations"
        constraints = [models.UniqueConstraint(fields=["project", "calculation_number"], name="engineering_calc_project_number")]


class EngineeringCalculationRevision(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    calculation = models.ForeignKey(EngineeringCalculation, on_delete=models.CASCADE, related_name="revisions")
    revision_number = models.IntegerField()
    inputs = models.JSONField()
    assumptions = models.JSONField(default=dict)
    results = models.JSONField(default=dict)
    change_reason = models.TextField(blank=True)
    created_by = models.UUIDField()
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = "engineering_calculation_revisions"
        constraints = [models.UniqueConstraint(fields=["calculation", "revision_number"], name="engineering_calc_revision_number")]


class EngineeringRevision(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(EngineeringProject, on_delete=models.CASCADE, related_name="revisions")
    object_type = models.CharField(max_length=30)
    object_id = models.UUIDField()
    revision_number = models.CharField(max_length=20)
    change_description = models.TextField(blank=True)
    change_reason = models.TextField(blank=True)
    status = models.CharField(max_length=30, default="draft")
    created_by = models.UUIDField()
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = "engineering_revisions"
        constraints = [models.UniqueConstraint(fields=["object_type", "object_id", "revision_number"], name="engineering_revision_object_number")]


class HazopStudy(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(EngineeringProject, on_delete=models.CASCADE, related_name="hazop_studies")
    study_number = models.CharField(max_length=100)
    title = models.CharField(max_length=200)
    scope = models.TextField(blank=True)
    status = models.CharField(max_length=30, default="draft")
    created_by = models.UUIDField()
    updated_by = models.UUIDField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        db_table = "hazop_studies"
        constraints = [models.UniqueConstraint(fields=["project", "study_number"], name="hazop_study_project_number")]


class HazopNode(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    study = models.ForeignKey(HazopStudy, on_delete=models.CASCADE, related_name="nodes")
    node_number = models.CharField(max_length=50)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    equipment = models.ForeignKey(EngineeringEquipment, null=True, blank=True, on_delete=models.SET_NULL)
    line = models.ForeignKey(EngineeringLine, null=True, blank=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = "hazop_nodes"
        constraints = [models.UniqueConstraint(fields=["study", "node_number"], name="hazop_node_study_number")]


class HazopItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    node = models.ForeignKey(HazopNode, on_delete=models.CASCADE, related_name="items")
    parameter = models.CharField(max_length=100)
    guide_word = models.CharField(max_length=50)
    deviation = models.TextField()
    causes = models.TextField(blank=True)
    consequences = models.TextField(blank=True)
    safeguards = models.TextField(blank=True)
    recommendations = models.TextField(blank=True)
    action_owner = models.UUIDField(null=True, blank=True)
    due_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=30, default="open")
    created_by = models.UUIDField()
    updated_by = models.UUIDField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        db_table = "hazop_items"


class MocRequest(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(EngineeringProject, on_delete=models.CASCADE, related_name="mocs")
    moc_number = models.CharField(max_length=100)
    title = models.CharField(max_length=200)
    reason = models.TextField(blank=True)
    current_configuration = models.TextField(blank=True)
    proposed_configuration = models.TextField(blank=True)
    status = models.CharField(max_length=40, default="draft")
    risk_level = models.CharField(max_length=20, blank=True)
    created_by = models.UUIDField()
    updated_by = models.UUIDField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        db_table = "moc_requests"
        constraints = [models.UniqueConstraint(fields=["project", "moc_number"], name="moc_project_number")]


class MocAffectedObject(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    moc = models.ForeignKey(MocRequest, on_delete=models.CASCADE, related_name="affected_objects")
    object_type = models.CharField(max_length=30)
    object_id = models.UUIDField()
    impact_description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = "moc_affected_objects"


class MocReview(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    moc = models.ForeignKey(MocRequest, on_delete=models.CASCADE, related_name="reviews")
    review_type = models.CharField(max_length=50)
    reviewer_id = models.UUIDField()
    status = models.CharField(max_length=20, default="pending")
    comments = models.TextField(blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    class Meta:
        db_table = "moc_reviews"
        constraints = [models.UniqueConstraint(fields=["moc", "review_type"], name="moc_review_type")]


class EngineeringValidationResult(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(EngineeringProject, on_delete=models.CASCADE, related_name="validation_results")
    object_type = models.CharField(max_length=30)
    object_id = models.UUIDField()
    validation_type = models.CharField(max_length=50)
    status = models.CharField(max_length=20)
    errors = models.JSONField(default=list)
    warnings = models.JSONField(default=list)
    checked_objects = models.IntegerField(null=True, blank=True)
    created_by = models.UUIDField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = "engineering_validation_results"


class EngineeringAuditLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(EngineeringProject, null=True, blank=True, on_delete=models.SET_NULL, related_name="engineering_audit")
    user_id = models.UUIDField(null=True, blank=True)
    action = models.CharField(max_length=50)
    object_type = models.CharField(max_length=50, blank=True)
    object_id = models.UUIDField(null=True, blank=True)
    old_values = models.JSONField(null=True, blank=True)
    new_values = models.JSONField(null=True, blank=True)
    metadata = models.JSONField(default=dict)
    event_type = models.CharField(max_length=100, default="engineering.changed")
    correlation_id = models.UUIDField(default=uuid.uuid4, editable=False)
    revision = models.CharField(max_length=20, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = "engineering_audit_log"
