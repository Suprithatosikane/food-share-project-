# Use an official, lightweight Node.js runtime as the base image
FROM node:18-alpine

# Set the working directory directly inside the container
WORKDIR /app

# Copy the package.json and package-lock.json before copying other files to leverage Docker layer caching
COPY package*.json ./

# Install application dependencies
RUN npm install

# Copy the rest of the application source code 
COPY . .

# Expose the port the Express application runs on
EXPOSE 5000

# Start the application using the "start" script defined in package.json
CMD ["npm", "start"]
