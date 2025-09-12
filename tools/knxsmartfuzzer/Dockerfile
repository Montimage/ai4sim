# Start from the latest Python image
FROM python:3.12.4-bullseye

# Set the working directory in the container
WORKDIR /main

# Install iptables and other necessary packages
# Note: Since Python images are based on Debian, we use apt-get to install packages
RUN apt-get update && \
    apt-get install -y iptables iproute2 iputils-ping net-tools dsniff libnfnetlink-dev libnetfilter-queue-dev && \
    rm -rf /var/lib/apt/lists/*

# Upgrade pip to the latest version
RUN pip install --upgrade pip

# Copy the requirements file and install Python dependencies
COPY requirements.txt /main/
RUN pip install --no-cache-dir -r requirements.txt

# Copy the Python scripts for the attacks and the main bash script into the container
COPY *.py /main/
COPY main.sh /main/

# Make the main script executable
RUN chmod +x /main/main.sh

# Set the command to execute the main script
CMD ["./main.sh"]



