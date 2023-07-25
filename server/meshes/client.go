package meshes

import (
	"context"
	"net"
	"time"

	"google.golang.org/grpc"
)

// MeshClient represents a gRPC adapter client
type MeshClient struct {
	MClient MeshServiceClient
	conn    *grpc.ClientConn
}

// CreateClient creates a MeshClient for the given params
func CreateClient(ctx context.Context, meshLocationURL string) (*MeshClient, error) {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second) // Set an appropriate timeout
	defer cancel()

	var opts []grpc.DialOption

	// Use insecure credentials for now
	opts = append(opts, grpc.WithInsecure())

	// Set up dialer with context timeout
	dialer := func(ctx context.Context, addr string) (net.Conn, error) {
		return (&net.Dialer{}).DialContext(ctx, "tcp", addr)
	}
	opts = append(opts, grpc.WithContextDialer(dialer))

	conn, err := grpc.DialContext(ctx, meshLocationURL, opts...)
	if err != nil {
		return nil, err
	}

	mClient := NewMeshServiceClient(conn)

	return &MeshClient{
		conn:    conn,
		MClient: mClient,
	}, nil
}

// Close closes the MeshClient
func (m *MeshClient) Close() error {
	if m.conn != nil {
		return m.conn.Close()
	}
	return nil
}
