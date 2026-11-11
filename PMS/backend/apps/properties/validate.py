
from rest_framework import serializers


def validate_property_data(data):
    required_fields = ["name", "phone", "address"]

    for field in required_fields:
        if field in data and not data[field]:
            raise serializers.ValidationError({
                field: f"{field.replace('_', ' ').capitalize()} is required."
            })

    if "max_guests" in data and data["max_guests"] is not None and data["max_guests"] < 1:
        raise serializers.ValidationError({
            "max_guests": "A property must accept at least one guest."
        })

    numeric_fields = [
        "bedroom_count",
        "bed_count",
        "bathroom_count",
        "area",
        "base_price",
    ]

    for field in numeric_fields:
        if field in data and data[field] is not None and data[field] < 0:
            raise serializers.ValidationError({
                field: "This value cannot be negative."
            })
