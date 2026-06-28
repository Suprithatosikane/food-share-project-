# Use an official, lightweight Node.js runtime as the base image
FROM node:20-alpine

# Set the working directory directly inside the container
WORKDIR /app

# Copy the package.json and package-lock.json to leverage Docker layer caching
COPY package*.json ./

# Install application dependencies
RUN npm install

# Copy the rest of the application source code 
COPY . .

# Expose the port Vite development server runs on
EXPOSE 5173

# Start the application using Vite's development server listening on all network interfaces
CMD ["npm", "run", "dev", "--", "--host"]
