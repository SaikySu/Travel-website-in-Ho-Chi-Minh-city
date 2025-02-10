# Recognize Vehicles and Human Face by YOLOv8
## Introduction
This is the final project of Applied Artificial Intelligence. The topic is: Building a tourism website in Ho Chi Minh City using [A* Algorithm](https://en.wikipedia.org/wiki/A*_search_algorithm) to find the optimal route based on user preferences.

## Illustration
<p align="center">
  <img src="https://github.com/SaikySu/Travel-website-in-Ho-Chi-Minh-city/blob/main/illustration/Example.png" width="400"><br/>
  <i>Sample results</i>
</p>

## How to use
1. Download the source code in the repository.
2. Install all requirements libraries
3. Run this code in: 

```python
    python app.py
```

## Features
**Map display**: Use Leaflet to show the distance traveled in real time.

**Location information**: The location information will be taken from the Cities.json file to display information of each location.

**A* algorithm**: The A* algorithm will search for the shortest routes depending on the user's choice and the associated cost

## Mainly used libraries/software
* Flask
* Flask-Cors
* React
* Numpy

## Some notes:
* You can change the priority and distance of locations in the Cities.json file: 

```json
    "distances": {
            "quan1": 3.5,
            "tanbinh": 4.8,
            "phunhuan": 3.2
        }
```
```json
        "cultural_score": 6,
        "nature_score": 6,
        "food_score": 6
```

* Similarly, you can change the location of the places along with the accompanying travel information: 

```json
    "name": "Quận 1",
        "coords": [10.7756, 106.7019],
        "connections": ["quan3", "quan4", "quan5", "binhthanh"],
```
```json
    "attractions": ["Nhà thờ Đức Bà", "Dinh Độc Lập"],
        "foods": ["Phở Hiền 1985: 269A Nguyễn Trãi, phường Nguyễn Cư Trinh, quận 1, TP. HCM", "Hủ tiếu Thanh Xuân: 62 Tôn Thất Thiệp, phường Bến Nghé, quận 1, TP.HCM"],
```