from django.db import models
from apps.core.models import BaseModel
from apps.properties.models import Property
from apps.reservations.models import Reservation


class FinancialTransaction(BaseModel):

    class TransactionType(models.TextChoices):
        INCOME = "income", "Income"
        EXPENSE = "expense", "Expense"

    property = models.ForeignKey(
        Property,
        on_delete=models.PROTECT,
        related_name="financial_transactions"
    )
    reservation = models.ForeignKey(
        Reservation,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="financial_transactions"
    )
    transaction_type = models.CharField(
        max_length=10,
        choices=TransactionType.choices
    )
    category = models.CharField(max_length=100)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default="TRY")
    description = models.TextField(blank=True)
    transaction_date = models.DateField()

    def __str__(self):
        return f"{self.transaction_type} - {self.amount}"
