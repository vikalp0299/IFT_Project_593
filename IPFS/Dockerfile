# Use a standard Go build image
FROM golang:1.21-alpine AS builder

# Install build dependencies
RUN apk add --no-cache git gcc musl-dev

# Copy our custom build files into the container
WORKDIR /src
COPY go.mod .
COPY main.go .

# Let Go handle all the dependencies and build the binary
RUN go mod tidy
RUN CGO_ENABLED=1 go build -o /out/ipfs .

# --- Final Image ---
# Start from a minimal alpine image
FROM alpine:latest

# We need this for the IPFS binary to work correctly
RUN apk add --no-cache ca-certificates

# Copy ONLY the final compiled binary from the builder stage
COPY --from=builder /out/ipfs /usr/local/bin/ipfs

# Standard IPFS setup for the container
ENV IPFS_PATH /data/ipfs
VOLUME /data/ipfs
EXPOSE 4001 5001 8080

# This startup script is a simplified version of the official one
ENTRYPOINT ["/bin/sh", "-c", " \
    set -e; \
    if [ -e \"$IPFS_PATH/config\" ]; then \
        echo \"IPFS repo already initialized.\"; \
    else \
        echo \"Initializing IPFS repo...\"; \
        ipfs init; \
    fi; \
    exec ipfs daemon --migrate=true \
"]