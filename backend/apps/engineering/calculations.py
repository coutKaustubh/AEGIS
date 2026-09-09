"""Deterministic preliminary engineering calculations. SI is used internally."""
import math


UNIT = {
    "m3/h": lambda x: x / 3600.0, "m3/s": lambda x: x, "L/min": lambda x: x / 60000.0,
    "kg/s": lambda x: x, "kg/h": lambda x: x / 3600.0,
    "mm": lambda x: x / 1000.0, "inch": lambda x: x * 0.0254, "m": lambda x: x,
    "bar": lambda x: x * 100000.0, "kPa": lambda x: x * 1000.0, "Pa": lambda x: x, "psi": lambda x: x * 6894.757,
    "c": lambda x: x, "°C": lambda x: x, "f": lambda x: (x - 32) * 5 / 9, "°F": lambda x: (x - 32) * 5 / 9,
}


def si(value, unit):
    if value is None or unit not in UNIT:
        raise ValueError(f"Unsupported or missing unit: {unit}")
    return UNIT[unit](float(value))


def _required(inputs, names):
    missing = [name for name in names if inputs.get(name) in (None, "")]
    if missing:
        return {"status": "incomplete", "errors": [{"code": "MISSING_INPUT", "field": x} for x in missing]}
    return None


def pipe_sizing(i):
    invalid = _required(i, ["flow_rate", "flow_rate_unit", "density", "density_unit", "target_velocity", "target_velocity_unit"])
    if invalid: return invalid
    q = si(i["flow_rate"], i["flow_rate_unit"]); rho = float(i["density"]); target = float(i["target_velocity"])
    if q <= 0 or rho <= 0 or target <= 0: return {"status": "error", "errors": [{"code": "NON_POSITIVE_INPUT"}]}
    diameter = math.sqrt(4 * q / (math.pi * target))
    candidates = i.get("candidate_diameters", [100, 150, 200, 250])
    rows = []
    for d in candidates:
        d_m = si(d, i.get("candidate_diameter_unit", "mm")); velocity = 4 * q / (math.pi * d_m * d_m)
        rows.append({"diameter": d, "unit": i.get("candidate_diameter_unit", "mm"), "velocity": round(velocity, 5), "status": "PASS" if velocity <= target else "WARNING"})
    return {"status": "pass", "results": {"theoretical_diameter_m": diameter, "candidates": rows}, "intermediate": {"flow_m3_s": q, "target_velocity_m_s": target}, "assumptions": {"profile": "incompressible, steady flow"}}


def pressure_drop(i):
    invalid = _required(i, ["pipe_length", "pipe_length_unit", "diameter", "diameter_unit", "flow_rate", "flow_rate_unit", "density", "roughness", "roughness_unit"])
    if invalid: return invalid
    L = si(i["pipe_length"], i["pipe_length_unit"]); D = si(i["diameter"], i["diameter_unit"]); Q = si(i["flow_rate"], i["flow_rate_unit"]); rho = float(i["density"]); eps = si(i["roughness"], i["roughness_unit"])
    if min(L, D, Q, rho) <= 0: return {"status": "error", "errors": [{"code": "NON_POSITIVE_INPUT"}]}
    area = math.pi * D * D / 4; velocity = Q / area; re = float(i.get("reynolds_number") or 1e6)
    rel = eps / D
    friction = 0.25 / (math.log10(rel / 3.7 + 5.74 / re ** 0.9) ** 2)
    dp = friction * L / D * rho * velocity ** 2 / 2 + rho * 9.80665 * float(i.get("elevation", 0))
    return {"status": "pass", "results": {"pressure_drop_pa": dp, "pressure_drop_bar": dp / 100000, "velocity_m_s": velocity, "reynolds": re, "friction_factor": friction}, "assumptions": {"equation": "Darcy-Weisbach with Swamee-Jain friction factor", "fittings": "represented by optional equivalent length; preliminary only"}}


def pump_sizing(i):
    invalid = _required(i, ["flow_rate", "flow_rate_unit", "head", "head_unit", "density"])
    if invalid: return invalid
    Q = si(i["flow_rate"], i["flow_rate_unit"]); H = si(i["head"], i["head_unit"]); rho = float(i["density"]); eta = float(i.get("efficiency", 0.70))
    if min(Q, H, rho, eta) <= 0 or eta > 1: return {"status": "error", "errors": [{"code": "INVALID_PUMP_INPUT"}]}
    hydraulic = rho * 9.80665 * Q * H / 1000; shaft = hydraulic / eta
    return {"status": "pass", "results": {"hydraulic_power_kw": hydraulic, "shaft_power_kw": shaft, "recommended_motor_kw": shaft * 1.15, "head_m": H, "flow_m3_s": Q}, "assumptions": {"efficiency": eta, "motor_margin": "15%"}}


def heat_exchanger(i):
    invalid = _required(i, ["hot_flow", "hot_flow_unit", "hot_cp", "cold_cp", "hot_inlet", "hot_outlet", "cold_inlet", "cold_outlet", "overall_u"])
    if invalid: return invalid
    mh = si(i["hot_flow"], i["hot_flow_unit"]); cp_h = float(i["hot_cp"]); cp_c = float(i["cold_cp"]); thi, tho, tci, tco = map(float, (i["hot_inlet"], i["hot_outlet"], i["cold_inlet"], i["cold_outlet"]))
    dt1, dt2 = thi - tco, tho - tci
    if min(mh, cp_h, cp_c, float(i["overall_u"])) <= 0 or dt1 <= 0 or dt2 <= 0: return {"status": "error", "errors": [{"code": "INVALID_TEMPERATURE_OR_PROPERTY"}]}
    lmtd = (dt1 - dt2) / math.log(dt1 / dt2) if abs(dt1 - dt2) > 1e-9 else dt1
    duty = mh * cp_h * (thi - tho) / 1000; area = duty * 1000 / (float(i["overall_u"]) * lmtd)
    return {"status": "pass", "results": {"duty_kw": duty, "lmtd_c": lmtd, "estimated_area_m2": area}, "assumptions": {"method": "LMTD, preliminary counter-current estimate"}}


CALCULATORS = {"pipe_sizing": pipe_sizing, "pressure_drop": pressure_drop, "pump_sizing": pump_sizing, "heat_exchanger": heat_exchanger}
