package helpers

import (
	"context"
	"fmt"
	"io"
	"net"
	"net/url"
	"os"
	"strconv"
	"sync"
	"time"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/network"
	"github.com/docker/docker/client"
	"github.com/docker/go-connections/nat"
	"github.com/layer5io/meshery/server/helpers/utils"
	"github.com/layer5io/meshery/server/models"
	"github.com/layer5io/meshkit/logger"
)

// AdaptersTracker is used to hold the list of known adapters
type AdaptersTracker struct {
	adapters     map[string]models.Adapter
	adaptersLock *sync.Mutex
	log          logger.Handler
}

// NewAdaptersTracker returns an instance of AdaptersTracker
func NewAdaptersTracker(adapterURLs []string) *AdaptersTracker {
	initialAdapters := make(map[string]models.Adapter)
	for _, u := range adapterURLs {
		port, err := extractPortFromURL(u)
		if err != nil {
			// Handle error accordingly
			continue
		}

		adapter := models.Adapter{
			Host: u,
			Port: port,
		}
		initialAdapters[u] = adapter
	}

	a := &AdaptersTracker{
		adapters:     initialAdapters,
		adaptersLock: &sync.Mutex{},
	}

	return a
}

func extractPortFromURL(urlstr string) (string, error) {
	u, err := url.Parse(urlstr)
	if err != nil {
		return "", err
	}

	// Split the host:port from the URL
	_, port, err := net.SplitHostPort(u.Host)
	if err != nil {
		return "", err
	}

	return port, nil
}

// AddAdapter is used to add new adapters to the collection
func (a *AdaptersTracker) AddAdapter(_ context.Context, adapter models.Adapter) {
	a.adaptersLock.Lock()
	defer a.adaptersLock.Unlock()
	a.adapters[adapter.Name] = adapter
}

// RemoveAdapter is used to remove existing adapters from the collection
func (a *AdaptersTracker) RemoveAdapter(_ context.Context, adapter models.Adapter) {
	a.adaptersLock.Lock()
	defer a.adaptersLock.Unlock()
	delete(a.adapters, adapter.Name)
}

// GetAdapters returns the list of existing adapters
func (a *AdaptersTracker) GetAdapters(_ context.Context) []models.Adapter {
	a.adaptersLock.Lock()
	defer a.adaptersLock.Unlock()

	ad := make([]models.Adapter, 0)
	for _, x := range a.adapters {
		ad = append(ad, x)
	}
	return ad
}

// AddAdapter is used to add new adapters to the collection
func (a *AdaptersTracker) DeployAdapter(ctx context.Context, adapter models.Adapter) error {
	platform := utils.GetPlatform()

	// Deploy to the current platform
	switch platform {
	case "docker":
		cli, err := client.NewClientWithOpts(client.FromEnv)
		if err != nil {
			return fmt.Errorf("failed to create Docker client: %w", err)
		}

		adapterImage := "layer5/" + adapter.Name + ":stable-latest"

		// Pull the latest image
		reader, err := cli.ImagePull(ctx, adapterImage, types.ImagePullOptions{})
		if err != nil {
			return fmt.Errorf("failed to pull Docker image: %w", err)
		}
		defer reader.Close()
		_, _ = io.Copy(os.Stdout, reader)

		// Create and start the container
		portNum := adapter.Port
		port := nat.Port(portNum + "/tcp")
		resp, err := cli.ContainerCreate(ctx, &container.Config{
			Image: adapterImage,
			ExposedPorts: nat.PortSet{
				port: struct{}{},
			},
		}, &container.HostConfig{
			PortBindings: nat.PortMap{
				port: []nat.PortBinding{
					{
						HostIP:   "127.0.0.1",
						HostPort: portNum,
					},
				},
			},
		}, &network.NetworkingConfig{}, nil, adapter.Name+"-"+fmt.Sprint(time.Now().Unix()))
		if err != nil {
			return fmt.Errorf("failed to create Docker container: %w", err)
		}

		if err := cli.ContainerStart(ctx, resp.ID, types.ContainerStartOptions{}); err != nil {
			return fmt.Errorf("failed to start Docker container: %w", err)
		}

	default:
		return fmt.Errorf("the platform %s is not currently supported. The supported platforms are: docker, kubernetes", platform)
	}

	a.AddAdapter(ctx, adapter)
	return nil
}

// RemoveAdapter is used to remove existing adapters from the collection
func (a *AdaptersTracker) UndeployAdapter(ctx context.Context, adapter models.Adapter) error {
	platform := utils.GetPlatform()

	// Undeploy from the current platform
	switch platform {
	case "docker":
		cli, err := client.NewClientWithOpts(client.FromEnv)
		if err != nil {
			return fmt.Errorf("failed to create Docker client: %w", err)
		}

		containers, err := cli.ContainerList(ctx, types.ContainerListOptions{})
		if err != nil {
			return fmt.Errorf("failed to list Docker containers: %w", err)
		}

		found := false
		for _, container := range containers {
			for _, p := range container.Ports {
				if strconv.Itoa(int(p.PublicPort)) == adapter.Port {
					found = true

					// Stop and remove the container
					err = cli.ContainerStop(ctx, container.ID, nil)
					if err != nil {
						return fmt.Errorf("failed to stop Docker container: %w", err)
					}

					err = cli.ContainerRemove(ctx, container.ID, types.ContainerRemoveOptions{
						Force:         true,
						RemoveVolumes: true,
					})
					if err != nil {
						return fmt.Errorf("failed to remove Docker container: %w", err)
					}

					break
				}
			}
		}

		if !found {
			return fmt.Errorf("no container found for port %d", adapter.Port)
		}

	default:
		return fmt.Errorf("the platform %s is not currently supported. The supported platforms are: docker, kubernetes", platform)
	}

	a.RemoveAdapter(ctx, adapter)
	return nil
}
