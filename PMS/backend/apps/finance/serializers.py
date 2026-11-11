from rest_framework import serializers
from .models import FinancialTransaction

class FinancialTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = FinancialTransaction
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


    def validate_transaction_type(self, value):
        if value not in [choice[0] for choice in FinancialTransaction.TransactionType.choices]:
            raise serializers.ValidationError("Invalid transaction type.")
        return value

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Amount must be greater than zero.")
        return value

    def validate_currency(self, value):
        if len(value) != 3:
            raise serializers.ValidationError("Currency must be a 3-letter code.")
        return value.upper()