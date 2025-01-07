from django import forms
from .models import Dam, RealTimeSensorData, RemoteSensingData, Prediction, UserProfile
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth.models import User

class DamSelectionForm(forms.Form):
    dam = forms.ModelChoiceField(queryset=Dam.objects.all(), empty_label="Select a Dam")

    DATA_CHOICES = [
        ('realtime', 'Realtime Data'),
        ('prediction', 'Prediction Data'),
        ('gis', 'GIS Data'),
    ]
    data_category = forms.MultipleChoiceField(
        choices=DATA_CHOICES, 
        widget=forms.CheckboxSelectMultiple(attrs={'class':'data-category-checkbox'})
        )
    start_date = forms.DateField(widget=forms.DateInput(attrs={'type':'date'}))
    end_date = forms.DateField(widget=forms.DateInput(attrs={'type':'date'}))

class CustomUserCreationForm(UserCreationForm):
    email = forms.EmailField(required=True)
    phone_number = forms.CharField(required=True)
    dam = forms.ModelChoiceField(queryset=Dam.objects.all(), required=True, empty_label="Select Dam")

    class Meta:
        model = User
        fields = ("username", "email","dam", "phone_number", "password1", "password2",)



