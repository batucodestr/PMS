from django.db import models
from apps.core.models import BaseModel
from apps.reservations.models import Reservation
from apps.properties.models import Property

# Create your models here.


class GeneralTask(BaseModel):

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        IN_PROGRESS = 'in_progress', 'In Progress'
        COMPLETED = 'completed', 'Completed'
        
    property = models.ForeignKey(
        Property,
        on_delete=models.CASCADE,
        related_name='general_tasks'
    )
    description = models.TextField(null=False, blank=False)
    assigned_to = models.ForeignKey(
        "auth.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    due_date = models.DateField()
    completed_date = models.DateField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )

    def __str__(self):
        return f"{self.property.name} - {self.description[:20]}"


class HouseKeepingTasks(BaseModel):

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        IN_PROGRESS = 'in_progress', 'In Progress'
        COMPLETED = 'completed', 'Completed'

    property = models.ForeignKey(
        Property,
        on_delete=models.CASCADE,
        related_name='housekeeping_tasks'
    )
    reservation = models.ForeignKey(
        Reservation,
        on_delete=models.CASCADE,
        related_name='housekeeping_tasks',
        null=True,
        blank=True,
    )
    assigned_to = models.ForeignKey(
        "auth.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )
    scheduled_date = models.DateField()
    completed_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)

    def __str__(self):
        return f"{self.property.name} - {self.status}"


class StayRecord(BaseModel):
    reservation = models.OneToOneField(
        Reservation,
        on_delete=models.CASCADE,
        related_name="stay_record"
    )
    actual_check_in = models.DateTimeField(null=True, blank=True)
    actual_check_out = models.DateTimeField(null=True, blank=True)
    checked_in_by = models.ForeignKey(
        "auth.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="check_ins"
    )
    checked_out_by = models.ForeignKey(
        "auth.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="check_outs"
    )
    notes = models.TextField(blank=True)
