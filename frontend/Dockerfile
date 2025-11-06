# Frontend image
FROM node:20-alpine

WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy all frontend files
COPY . .

# Expose port
EXPOSE 3000

# Use environment variable for backend API
ENV REACT_APP_API_URL=http://backend:8000

# Start React dev server
CMD ["npm", "start", "--", "--host", "0.0.0.0"]
