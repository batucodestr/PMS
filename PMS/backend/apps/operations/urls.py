from rest_framework.routers import SimpleRouter

from .views import HouseKeepingTasksViewSet, GeneralTaskViewSet

router = SimpleRouter()
router.register('housekeeping', HouseKeepingTasksViewSet, basename='housekeeping')
router.register('general-tasks', GeneralTaskViewSet, basename='general-task')

urlpatterns = router.urls
