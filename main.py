from fastapi import FastAPI
import pandas as pd
from pydantic import BaseModel ,Field
app = FastAPI()
import joblib
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

#pyandantic model = the input validation model for the input data

columns = ['latitude', 'longitude', 'price', 'minimum_nights', 'number_of_reviews', 'reviews_per_month','calculated_host_listings_count', 'availability_365', 'neighbourhood_group', 'neighbourhood']
model = joblib.load('model_pipeline.pkl')  # Load the trained model pipeline
class InputData(BaseModel):
    latitude: float = Field(...,ge=-90,le=90,description="Latitude must be between -90 and 90")
    longitude: float = Field(...,ge=-180,le=180,description="Longitude must be between -180 and 180")
    price : float = Field(...,gt=0 ,description="Price must be greater than 0")
    minimum_nights : int = Field(..., gt=0 ,le=365,description="Minimum nights must be greater than 0")
    number_of_reviews : int = Field(..., ge=0 ,description="Number of reviews must be greater than or equal to 0")
    reviews_per_month : float = Field(..., ge=0 ,description="Reviews per month must be greater than or equal to 0")
    calculated_host_listings_count : int = Field(..., ge=0 ,description="Calculated host listings count must be greater than or equal to 0")
    availability_365 : int = Field(..., ge=0,le=365 ,description="Availability 365 must be greater than or equal to 0")
    neighbourhood_group : str = Field(..., min_length=2, description="Neighbourhood group must be a string")
    neighbourhood : str = Field(..., min_length=2, description="Neighbourhood must be a string")
@app.get("/")
def greet():
    return {"message": "Hello, World!"}


@app.post("/predict")
def predict(input_data: InputData):
    row = pd.DataFrame([input_data.dict()],columns=columns)
    prediction = model.predict(row)
    probability = model.predict_proba(row)

    return {"predicted_room_type" : prediction.tolist(), "probability_of_prediction" : probability.tolist()[0]}


