#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import re
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlparse


ADOPTION_SEGMENTS = [
    {"label": "Innovators", "percent": 2.5, "endPosition": 17.3},
    {"label": "Early\nAdopters", "percent": 13.5, "endPosition": 30.3},
    {"label": "Early\nMajority", "percent": 34, "endPosition": 49.8},
    {"label": "Late\nMajority", "percent": 34, "endPosition": 68.7},
    {"label": "Laggards", "percent": 16, "endPosition": 100},
]
SEGMENT_THUMBNAIL_HARD_CAP = 220
LOCKED_STORES_VISIBLE_COUNT = 5
DATE_PATTERN = re.compile(r"^(\d{4})-(\d{2})-(\d{2})")


def pick_first_non_empty_string(*values: Any) -> str | None:
    for value in values:
        if isinstance(value, str):
            trimmed = value.strip()
            if trimmed:
                return trimmed
    return None


def parse_opened_date(value: Any) -> datetime | None:
    if not isinstance(value, str):
        return None

    match = DATE_PATTERN.match(value)
    if not match:
        return None

    year, month, day = (int(part) for part in match.groups())
    return datetime(year, month, day, tzinfo=timezone.utc)


def to_safe_url(value: Any) -> str | None:
    if not isinstance(value, str):
        return None

    candidate = value.strip()
    if not candidate:
        return None

    parsed = urlparse(candidate)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        return None

    return candidate


def to_safe_email_address(value: Any) -> str | None:
    if not isinstance(value, str):
        return None

    candidate = value.strip()
    if not candidate or "@" not in candidate or any(char.isspace() for char in candidate):
        return None

    return candidate


def quarter_start(value: datetime) -> datetime:
    quarter_month = (value.month - 1) // 3 * 3 + 1
    return datetime(value.year, quarter_month, 1, tzinfo=timezone.utc)


def advance_quarter(value: datetime) -> datetime:
    month = value.month + 3
    year = value.year
    if month > 12:
        month -= 12
        year += 1
    return datetime(year, month, 1, tzinfo=timezone.utc)


def to_timestamp_millis(value: datetime) -> int:
    return int(value.timestamp() * 1000)


def normalize_record(record: Any) -> dict[str, Any] | None:
    if not isinstance(record, dict):
        return None

    institution = record.get("institution") if isinstance(record.get("institution"), dict) else None
    root_profile = (
        institution.get("root_profile")
        if isinstance(institution, dict) and isinstance(institution.get("root_profile"), dict)
        else None
    )
    location = record.get("location") if isinstance(record.get("location"), dict) else None

    nested_root_profile_name = pick_first_non_empty_string(
        root_profile.get("name") if isinstance(root_profile, dict) else None
    )
    owner_name = pick_first_non_empty_string(
        record.get("owner_name"),
        record.get("root_profile_name"),
        nested_root_profile_name,
    )

    return {
        "id": record.get("id") or record.get("store_id"),
        "storefront_name": pick_first_non_empty_string(record.get("storefront_name"), record.get("name")),
        "street": pick_first_non_empty_string(record.get("street"), location.get("address") if isinstance(location, dict) else None),
        "city": pick_first_non_empty_string(record.get("city"), location.get("city") if isinstance(location, dict) else None),
        "websiteUrl": to_safe_url(
            pick_first_non_empty_string(record.get("store_url"), institution.get("website") if isinstance(institution, dict) else None)
        ),
        "owner_name": owner_name,
        "institution_name": pick_first_non_empty_string(
            record.get("institution_name"),
            institution.get("name") if isinstance(institution, dict) else None,
        ),
        "linkedinUrl": to_safe_url(
            pick_first_non_empty_string(
                record.get("owner_linkedin"),
                root_profile.get("linkedin_link") if isinstance(root_profile, dict) else None,
                institution.get("linkedin_link") if isinstance(institution, dict) else None,
            )
        ),
        "imageUrl": to_safe_url(
            pick_first_non_empty_string(
                record.get("owner_thumbnail"),
                record.get("profile_picture"),
                root_profile.get("profile_picture") if isinstance(root_profile, dict) else None,
                record.get("owner_profile_picture"),
                record.get("owner_image_url"),
                record.get("owner_image"),
                record.get("thumbnail_url"),
                record.get("photo_url"),
                record.get("image_url"),
                record.get("image"),
            )
        ),
        "hasEmail": bool(
            pick_first_non_empty_string(
                record.get("email_address"),
                record.get("owner_email"),
                record.get("email"),
            )
        ),
        "date_opened": pick_first_non_empty_string(record.get("date_opened")),
    }


def has_avatar_image(store: dict[str, Any]) -> bool:
    return bool(store.get("imageUrl"))


def contact_rank(store: dict[str, Any]) -> int:
    return sum(
        1
        for key in ("websiteUrl", "linkedinUrl", "hasEmail")
        if store.get(key)
    )


def get_unique_stores(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    stores_by_id: dict[Any, dict[str, Any]] = {}
    for record in records:
        record_id = record.get("id")
        if record_id is None or record_id in stores_by_id:
            continue
        stores_by_id[record_id] = record
    return list(stores_by_id.values())


def segment_end_percent(index: int) -> float:
    return sum(segment["percent"] for segment in ADOPTION_SEGMENTS[: index + 1])


def assign_segment_indices(stores: list[dict[str, Any]]) -> None:
    dated_stores = [store for store in stores if store.get("openedDate") is not None]
    total_dated_stores = len(dated_stores)

    for index, store in enumerate(dated_stores):
        cumulative_position = ((index + 1) / total_dated_stores) * 100
        for segment_index in range(len(ADOPTION_SEGMENTS)):
            if cumulative_position <= segment_end_percent(segment_index):
                store["segmentIndex"] = segment_index
                break


def build_curve_buckets(dated_stores: list[dict[str, Any]]) -> list[dict[str, int]]:
    if not dated_stores:
        return []

    counts = Counter(
        to_timestamp_millis(quarter_start(store["openedDate"]))
        for store in dated_stores
        if store.get("openedDate") is not None
    )

    first_bucket = quarter_start(dated_stores[0]["openedDate"])
    last_bucket = quarter_start(dated_stores[-1]["openedDate"])
    buckets: list[dict[str, int]] = []

    bucket = first_bucket
    while bucket <= last_bucket:
        timestamp = to_timestamp_millis(bucket)
        buckets.append({"timestamp": timestamp, "count": counts.get(timestamp, 0)})
        bucket = advance_quarter(bucket)

    return buckets


def thumbnail_sort_key(store: dict[str, Any]) -> tuple[int, int, str]:
    return (
        0 if has_avatar_image(store) else 1,
        0 if store.get("owner_name") else 1,
        str(store.get("owner_name") or store.get("institution_name") or store.get("storefront_name") or ""),
    )


def get_segment_thumbnail_stores(segment_stores: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen_owners_without_image: set[str] = set()
    selected: list[dict[str, Any]] = []

    for store in segment_stores:
        if has_avatar_image(store):
            selected.append(store)
            continue

        owner_name = str(store.get("owner_name") or "").strip().lower()
        if owner_name:
            if owner_name in seen_owners_without_image:
                continue
            seen_owners_without_image.add(owner_name)

        selected.append(store)

    return sorted(selected, key=thumbnail_sort_key)


def table_sort_key(store: dict[str, Any]) -> tuple[Any, ...]:
    opened_date = store.get("openedDate")

    return (
        0 if has_avatar_image(store) else 1,
        0 if opened_date is not None else 1,
        opened_date or datetime.max.replace(tzinfo=timezone.utc),
        -contact_rank(store),
        str(store.get("street") or ""),
    )


def format_opened_label(opened_date: datetime | None) -> str:
    if opened_date is None:
        return "-"
    return opened_date.strftime("%b %d, %Y").replace(" 0", " ")


def build_year_range(segment_stores: list[dict[str, Any]]) -> dict[str, int] | None:
    opened_dates = [store.get("openedDate") for store in segment_stores if store.get("openedDate") is not None]
    if not opened_dates:
        return None

    start_year = min(opened_dates).year
    end_year = max(opened_dates).year
    return {"startYear": start_year, "endYear": end_year}


def build_payload(records: list[dict[str, Any]]) -> dict[str, Any]:
    stores = get_unique_stores(records)

    for store in stores:
        store["openedDate"] = parse_opened_date(store.get("date_opened"))
        store["segmentIndex"] = None

    stores.sort(
        key=lambda store: (
            1 if store.get("openedDate") is None else 0,
            store.get("openedDate") or datetime.max.replace(tzinfo=timezone.utc),
            str(store.get("street") or ""),
        )
    )
    assign_segment_indices(stores)

    dated_stores = [store for store in stores if store.get("openedDate") is not None]

    segments: list[dict[str, Any]] = []
    for segment_index in range(len(ADOPTION_SEGMENTS)):
        segment_stores = [store for store in stores if store.get("segmentIndex") == segment_index]
        thumbnail_stores = get_segment_thumbnail_stores(segment_stores)
        image_backed_thumbnails = [store for store in thumbnail_stores if has_avatar_image(store)]

        rows = []
        for store in sorted(segment_stores, key=table_sort_key)[:LOCKED_STORES_VISIBLE_COUNT]:
            opened_date = store.get("openedDate")
            rows.append(
                {
                    "name": store.get("owner_name")
                    or store.get("institution_name")
                    or store.get("storefront_name")
                    or "-",
                    "imageUrl": store.get("imageUrl"),
                    "websiteUrl": store.get("websiteUrl"),
                    "linkedinUrl": store.get("linkedinUrl"),
                    "hasEmail": bool(store.get("hasEmail")),
                    "openedLabel": format_opened_label(opened_date),
                    "openedTimestamp": to_timestamp_millis(opened_date) if opened_date else None,
                    "address": store.get("street"),
                }
            )

        segments.append(
            {
                "storeCount": len(segment_stores),
                "hiddenThumbnailCount": max(
                    0,
                    len(thumbnail_stores) - min(len(image_backed_thumbnails), SEGMENT_THUMBNAIL_HARD_CAP),
                ),
                "yearRange": build_year_range(segment_stores),
                "thumbnails": [
                    {"imageUrl": store["imageUrl"]}
                    for store in image_backed_thumbnails[:SEGMENT_THUMBNAIL_HARD_CAP]
                ],
                "rows": rows,
            }
        )

    return {
        "totalStores": len(stores),
        "curveBuckets": build_curve_buckets(dated_stores),
        "segments": segments,
    }


def default_output_path(input_path: Path) -> Path:
    if input_path.name.endswith("-full.json"):
        return input_path.with_name(input_path.name.replace("-full.json", ".json"))
    if input_path.name.endswith("_full.json"):
        return input_path.with_name(input_path.name.replace("_full.json", ".json"))
    return input_path.with_name(f"{input_path.stem}.reduced.json")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Reduce a full Crumbl JSON export to the compact dataviz payload."
    )
    parser.add_argument("input", help="Path to the full source JSON file.")
    parser.add_argument(
        "output",
        nargs="?",
        help="Path to the reduced output JSON file. Defaults next to the input file.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    input_path = Path(args.input).expanduser().resolve()
    output_path = (
        Path(args.output).expanduser().resolve()
        if args.output
        else default_output_path(input_path)
    )

    records = json.loads(input_path.read_text(encoding="utf-8"))
    if not isinstance(records, list):
        raise ValueError("Input JSON must be an array of records")

    payload = build_payload(
        [normalized for normalized in (normalize_record(record) for record in records) if normalized]
    )
    output_path.write_text(f"{json.dumps(payload, indent=2, ensure_ascii=True)}\n", encoding="utf-8")

    print(f"Wrote {output_path} with {payload['totalStores']} stores")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())