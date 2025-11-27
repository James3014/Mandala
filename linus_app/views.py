from typing import Dict, List, Any
from .models import Segment, GridAssignment
from .mandala_blueprint import get_mandala

def format_segment_result(segment: Segment, classifier_used: str, classifier_error: str | None, outcome: Dict) -> Dict:
    result_payload = {
        "segment_id": segment.id,
        "grid_assignments": [
            {
                "grid_id": assignment.grid_id,
                "confidence": assignment.confidence,
                "secondary": assignment.secondary,
                "related_keywords": assignment.related_keywords,
            }
            for assignment in segment.assignments
        ],
        "snippet": segment.text.replace("\n", " ")[:80],
        "classifier": classifier_used,
    }
    
    if classifier_error:
        result_payload["error"] = classifier_error
        
    # Augment outcome with error note if needed
    if classifier_error:
        note = outcome.get("summary_notes", "") or ""
        prefix = f"(Gemini fallback: {classifier_error}) "
        outcome["summary_notes"] = prefix + note
        
    result_payload.update(outcome)
    return result_payload

def format_grid_response(cell: Any, grid_id: int) -> Dict:
    payload = cell.to_dict()
    mandala = get_mandala(grid_id)
    if mandala:
        payload["mandala"] = mandala
    return payload

def format_segment_log(segment_id: str, logs: List[Any]) -> Dict:
    return {
        "segment_id": segment_id,
        "history": [log.to_dict() for log in logs],
    }

def format_all_grids(grids: List[Dict]) -> Dict:
    return {"grids": grids}
