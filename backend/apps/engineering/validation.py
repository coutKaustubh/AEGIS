from collections import Counter


def validate_diagram(canvas):
    nodes = canvas.get("nodes") or []
    edges = canvas.get("connections") or canvas.get("edges") or []
    errors, warnings = [], []
    ids = [str(x.get("id")) for x in nodes]
    tags = [str(x.get("tag", "")).strip() for x in nodes]
    for value, count in Counter(ids).items():
        if value in {"None", ""} or count > 1: errors.append({"code": "DUPLICATE_OBJECT_ID", "rule_id": "PID-001", "severity": "error", "object_id": value, "message": "Object IDs must be present and unique.", "remediation": "Assign a stable UUID to each visual object.", "focus": {"kind": "diagram_object", "object_id": value}})
    for value, count in Counter(x for x in tags if x).items():
        if count > 1: errors.append({"code": "DUPLICATE_TAG", "rule_id": "PID-002", "severity": "error", "object_id": value, "message": "Engineering tags must be unique within the diagram.", "remediation": "Use a unique engineering tag within the project.", "focus": {"kind": "tag", "tag": value}})
    node_ids = set(ids)
    connected = set()
    for edge in edges:
        source, target = str(edge.get("source")), str(edge.get("target"))
        if source not in node_ids: errors.append({"code": "MISSING_SOURCE", "rule_id": "PID-003", "severity": "error", "object_id": source, "message": "Connection source does not exist.", "remediation": "Connect the line to an existing process object.", "focus": {"kind": "connection", "object_id": source}})
        else: connected.add(source)
        if target not in node_ids: errors.append({"code": "MISSING_DESTINATION", "rule_id": "PID-004", "severity": "error", "object_id": target, "message": "Connection destination does not exist.", "remediation": "Select a valid destination object or remove the connection.", "focus": {"kind": "connection", "object_id": target}})
        else: connected.add(target)
    for node in nodes:
        kind = str(node.get("kind", node.get("type", ""))).lower()
        if kind in {"instrument", "indicator", "transmitter"} and str(node.get("id")) not in connected:
            warnings.append({"code": "ORPHAN_INSTRUMENT", "rule_id": "PID-005", "severity": "warning", "object_id": node.get("id"), "message": "Instrument is not connected to a process object.", "remediation": "Connect the instrument to its measured line or equipment.", "focus": {"kind": "diagram_object", "object_id": node.get("id")}})
        if kind in {"pipe", "line", "stream"} and str(node.get("id")) not in connected:
            errors.append({"code": "DISCONNECTED_PIPE", "rule_id": "PID-006", "severity": "error", "object_id": node.get("id"), "message": "Pipe/stream has no connection.", "remediation": "Connect the pipe to both a source and destination.", "focus": {"kind": "diagram_object", "object_id": node.get("id")}})
    return {"status": "error" if errors else "warning" if warnings else "pass", "errors": errors, "warnings": warnings, "checked_objects": len(nodes)}
