from django import forms
from .models import Dam, RealTimeSensorData, RemoteSensingData, Prediction

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