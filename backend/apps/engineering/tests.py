from uuid import uuid4

from django.test import SimpleTestCase

from .calculations import heat_exchanger, pipe_sizing, pressure_drop, pump_sizing
from .validation import validate_diagram
from .views import event_type_for
from .models import EngineeringEquipment


class EngineeringCalculationTests(SimpleTestCase):
    def test_pipe_sizing_returns_candidates_and_normalizes_flow(self):
        result = pipe_sizing({"flow_rate": 300, "flow_rate_unit": "m3/h", "density": 820, "density_unit": "kg/m3", "target_velocity": 3, "target_velocity_unit": "m/s", "candidate_diameters": [100, 150]})
        self.assertEqual(result["status"], "pass")
        self.assertEqual(len(result["results"]["candidates"]), 2)
        self.assertAlmostEqual(result["intermediate"]["flow_m3_s"], 300 / 3600)

    def test_invalid_calculation_is_not_silently_calculated(self):
        self.assertEqual(pipe_sizing({"flow_rate": 0, "flow_rate_unit": "m3/h", "density": 820, "density_unit": "kg/m3", "target_velocity": 3, "target_velocity_unit": "m/s"})["status"], "error")
        self.assertEqual(pressure_drop({})["status"], "incomplete")

    def test_pump_and_exchanger_are_deterministic(self):
        pump = pump_sizing({"flow_rate": 300, "flow_rate_unit": "m3/h", "head": 80, "head_unit": "m", "density": 820, "efficiency": .7})
        hx = heat_exchanger({"hot_flow": 10, "hot_flow_unit": "kg/s", "hot_cp": 2, "cold_cp": 4, "hot_inlet": 180, "hot_outlet": 120, "cold_inlet": 40, "cold_outlet": 100, "overall_u": 500})
        self.assertGreater(pump["results"]["hydraulic_power_kw"], 0)
        self.assertGreater(hx["results"]["estimated_area_m2"], 0)


class PidValidationTests(SimpleTestCase):
    def test_duplicate_tag_and_orphan_instrument(self):
        result = validate_diagram({"nodes": [{"id": "1", "tag": "P-101", "kind": "pump"}, {"id": "2", "tag": "P-101", "kind": "instrument"}], "connections": []})
        codes = {item["code"] for item in result["errors"] + result["warnings"]}
        self.assertIn("DUPLICATE_TAG", codes)
        self.assertIn("ORPHAN_INSTRUMENT", codes)

    def test_missing_destination_is_error(self):
        result = validate_diagram({"nodes": [{"id": "1", "tag": "P-101", "kind": "pump"}], "connections": [{"source": "1", "target": "missing"}]})
        self.assertEqual(result["status"], "error")
        self.assertEqual(result["errors"][0]["code"], "MISSING_DESTINATION")
        self.assertIn("rule_id", result["errors"][0])
        self.assertIn("remediation", result["errors"][0])

    def test_canonical_event_type_is_stable(self):
        self.assertEqual(event_type_for("created", EngineeringEquipment()), "equipment.created")
