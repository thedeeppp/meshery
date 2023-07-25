package models

import (
	"context"
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/layer5io/meshery/server/meshes"
)

// Available Meshery adapters
var (
	Istio    = Adapter{Name: "meshery-istio", Host: "localhost", Port: "10000"}
	Linkerd  = Adapter{Name: "meshery-linkerd", Host: "localhost", Port: "10001"}
	Consul   = Adapter{Name: "meshery-consul", Host: "localhost", Port: "10002"}
	Octarine = Adapter{Name: "meshery-octarine", Host: "localhost", Port: "10003"}
	NSM      = Adapter{Name: "meshery-nsm", Host: "localhost", Port: "10004"}
	AWS      = Adapter{Name: "meshery-app-mesh", Host: "localhost", Port: "10005"}
	Traefik  = Adapter{Name: "meshery-traefik-mesh", Host: "localhost", Port: "10006"}
	Kuma     = Adapter{Name: "meshery-kuma", Host: "localhost", Port: "10007"}
	Citrix   = Adapter{Name: "meshery-citrix", Host: "localhost", Port: "1008"}
	OSM      = Adapter{Name: "meshery-osm", Host: "localhost", Port: "10009"}
	Nginx    = Adapter{Name: "meshery-nginx", Host: "localhost", Port: "10010"}
	Tanzu    = Adapter{Name: "meshery-tanzu", Host: "localhost", Port: "10011"}
	Cilium   = Adapter{Name: "meshery-cilium", Host: "localhost", Port: "10012"}
)

var ListAvailableAdapters = []Adapter{Istio, Linkerd, Consul, Octarine, NSM, AWS, Traefik, Kuma, Citrix, OSM, Nginx, Tanzu, Cilium}

// Adapter represents an adapter in Meshery
type Adapter struct {
	Name         string                       `json:"name"`
	Host         string                       `json:"host"`
	Port         string                       `json:"port"`
	Version      string                       `json:"version"`
	GitCommitSHA string                       `json:"git_commit_sha"`
	Ops          []*meshes.SupportedOperation `json:"ops"`
	Available    bool                         `json:"available"`
}

// AdaptersTrackerInterface defines the methods a type should implement to be an adapter tracker
type AdaptersTrackerInterface interface {
	AddAdapter(context.Context, Adapter)
	RemoveAdapter(context.Context, Adapter)
	GetAdapters(context.Context) []Adapter
	DeployAdapter(context.Context, Adapter) error
	UndeployAdapter(context.Context, Adapter) error
}

func init() {
	// Initialize the ports for adapters
	for i := range ListAvailableAdapters {
		ListAvailableAdapters[i].Port = GetNextAvailablePort()
		// Set the initial availability to true
		ListAvailableAdapters[i].Available = true

		// Start the background goroutine to check the availability periodically
		CheckAdapterAvailability(&ListAvailableAdapters[i])
	}
}

var availablePortMutex sync.Mutex
var nextAvailablePort = 9999

func GetNextAvailablePort() string {
	availablePortMutex.Lock()
	defer availablePortMutex.Unlock()

	nextAvailablePort++
	if nextAvailablePort >= 65535 {
		nextAvailablePort = 10000
	}
	return strconv.Itoa(nextAvailablePort)
}

func CheckAdapterAvailability(adapter *Adapter) {
	// Background goroutine to periodically update the availability
	go func() {
		ticker := time.NewTicker(5 * time.Second) // Adjust the interval as per your requirement
		defer ticker.Stop()

		for {
			select {
			case <-ticker.C:
				available := IsAdapterAvailable(*adapter)
				adapter.Available = available
			}
		}
	}()
}

// IsAdapterAvailable checks if the adapter is available and returns true if it is, false otherwise.
func IsAdapterAvailable(adapter Adapter) bool {
	if adapter.Host == "localhost" {
		// Custom logic to check if the adapter is available on localhost
		resp, err := http.Get("http://localhost:" + adapter.Port)
		if err != nil {
			// Error occurred while making the request
			return false
		}
		defer resp.Body.Close()

		// Check the response status code
		if resp.StatusCode == http.StatusOK {
			// Adapter is alive and pingable
			return true
		}

		// Adapter is not available or pingable
		return false
	}

	// Custom logic to check if the adapter is available in other environments
	// For example, you can use an HTTP request to the adapter's endpoint
	// and check if it returns a successful response.
	// Here, we are assuming the adapter's host is in the format "http://hostname:port".
	resp, err := http.Get(adapter.Host)
	if err != nil {
		// Error occurred while making the request
		return false
	}
	defer resp.Body.Close()

	// Check the response status code
	if resp.StatusCode == http.StatusOK {
		// Adapter is alive and pingable
		return true
	}

	// Adapter is not available or pingable
	return false
}
