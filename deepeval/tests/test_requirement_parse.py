"""Requirement input rules: splitting, the 100-word limit, the 50 cap and unsafe text."""

from .requirement_stubs import er


def words(n):
    return " ".join(f"w{i}" for i in range(n))


def test_exactly_max_words_accepted_and_one_more_rejected_with_line_number():
    text = f"{words(er.MAX_REQUIREMENT_WORDS)}\n{words(er.MAX_REQUIREMENT_WORDS + 1)}"
    parsed = er.parse_requirements_text(text)
    assert [r["words"] for r in parsed["requirements"]] == [er.MAX_REQUIREMENT_WORDS]
    assert len(parsed["rejected"]) == 1
    rejected = parsed["rejected"][0]
    assert rejected["line"] == 2
    assert rejected["words"] == er.MAX_REQUIREMENT_WORDS + 1
    assert "Line 2" in rejected["error"]


def test_bullets_numbering_checkboxes_headings_and_blank_lines():
    text = "# Product requirements\n\n- Greet the user\n* Reply in English\n+ Be brief\n1. Never share PII\n2) Cite sources\n• Stay polite\n- [x] Offer help\n   \n## Section\n"
    parsed = er.parse_requirements_text(text)
    assert [r["text"] for r in parsed["requirements"]] == [
        "Greet the user", "Reply in English", "Be brief", "Never share PII", "Cite sources", "Stay polite", "Offer help",
    ]
    assert parsed["rejected"] == []


def test_windows_line_endings_and_plain_lines():
    parsed = er.parse_requirements_text("First requirement\r\nSecond requirement\r\n")
    assert [r["text"] for r in parsed["requirements"]] == ["First requirement", "Second requirement"]


def test_nul_bytes_rejected():
    parsed = er.parse_requirements_text("Looks fine\x00\x01binary")
    assert parsed["requirements"] == []
    assert "NUL" in parsed["rejected"][0]["error"]


def test_validate_accepts_a_good_payload():
    assert er.validate_requirements([{"id": "R-01", "text": "Be polite"}, {"id": "R-102", "text": "Use English"}]) == []


def test_validate_enforces_cap_ids_duplicates_length_and_nul():
    too_many = [{"id": f"R-{i:02d}", "text": "x"} for i in range(1, er.MAX_REQUIREMENTS + 2)]
    assert any("At most" in e for e in er.validate_requirements(too_many))
    assert er.validate_requirements([{"id": "bad", "text": "x"}])
    assert any("duplicated" in e for e in er.validate_requirements([{"id": "R-01", "text": "a"}, {"id": "R-01", "text": "b"}]))
    assert any("words" in e for e in er.validate_requirements([{"id": "R-01", "text": words(er.MAX_REQUIREMENT_WORDS + 1)}]))
    assert any("NUL" in e for e in er.validate_requirements([{"id": "R-01", "text": "a\x00b"}]))
    assert any("empty" in e for e in er.validate_requirements([{"id": "R-01", "text": "   "}]))
    assert er.validate_requirements("not a list") == ["requirements must be a list"]
    assert er.validate_requirements([{"id": "R-01"}])


def test_limits_reuse_the_metric_bar():
    import evaluate_responses
    limits = er.limits()
    assert limits["maxRequirementWords"] == 100
    assert limits["maxRequirements"] == 50
    assert limits["thresholds"]["pass"] == evaluate_responses.PASS_THRESHOLD
    assert limits["thresholds"]["borderlineMargin"] == evaluate_responses.BORDERLINE_MARGIN
