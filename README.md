# Medicine Availability Mobile Application - Backend API

This is the backend system for the Medicine Availability Mobile Application, built with Node.js, Express.js, and MongoDB.

## Features
- User Authentication (JWT based, User & Pharmacy Owner roles)
- Pharmacy Management (Geospatial Location support)
- Medicine Management (Inventory tracking)
- Advanced Search (Text-based searching, Geospatial radius queries)

## Prerequisites
- Node.js (v14+)
- MongoDB (Running locally or MongoDB Atlas)

## Setup and Installation

1. Navigate to the project directory:
   ```bash
   cd /home/abhinandhc/Desktop/medical
   ```

2. Install dependencies (assuming you cloned this without `node_modules`):
   ```bash
   npm install
   ```

3. Ensure MongoDB is running locally on `mongodb://localhost:27017` or update the `MONGODB_URI` in the `.env` file.

4. Start the server:
   ```bash
   # For development (if nodemon is installed globally, else just use node)
   node server.js
   ```

## Example API Requests

### 1. Register a Pharmacy Owner
**POST** `/api/auth/register`
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "pharmacy_owner",
  "phone": "+1234567890",
  "latitude": 34.0522,
  "longitude": -118.2437
}
```

### 2. Login
**POST** `/api/auth/login`
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```
*(Save the `token` from the response for subsequent requests)*

### 3. Create a Pharmacy (Requires Auth Token)
**POST** `/api/pharmacies`
**Headers:** `Authorization: Bearer <YOUR_TOKEN>`
```json
{
  "pharmacyName": "Downtown Health Pharmacy",
  "address": "123 Main St, Cityville",
  "phone": "+1987654321",
  "latitude": 34.0520,
  "longitude": -118.2430,
  "openingHours": "8:00 AM - 10:00 PM"
}
```
*(Save the `_id` from the response to use as `pharmacyId` below)*

### 4. Add a Medicine (Requires Auth Token)
**POST** `/api/medicines`
**Headers:** `Authorization: Bearer <YOUR_TOKEN>`
```json
{
  "medicineName": "Paracetamol 500mg",
  "pharmacyId": "<PHARMACY_ID>",
  "stockQuantity": 50,
  "price": 5.99
}
```

### 5. Search for a Medicine (Public)
**GET** `/api/medicines/search?name=paracetamol`
**Response:**
```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "medicineName": "Paracetamol 500mg",
      "pharmacyName": "Downtown Health Pharmacy",
      "pharmacyLocation": {
        "type": "Point",
        "coordinates": [ -118.243, 34.052 ]
      },
      "address": "123 Main St, Cityville",
      "phoneNumber": "+1987654321",
      "availabilityStatus": "Available",
      "stockQuantity": 50,
      "price": 5.99,
      "lastUpdated": "2023-10-15T10:00:00.000Z"
    }
  ]
}
```

### 6. Search Nearby Pharmacies (Public)
**GET** `/api/pharmacies/nearby?lat=34.0522&lng=-118.2437&distance=10`
*Returns all pharmacies within a 10km radius of the provided coordinates.*
