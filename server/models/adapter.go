package models

import (
	"context"
	"net/http"
	"strconv"
	"sync"

	"github.com/layer5io/meshery/server/meshes"
)

// Available Meshery adapters
var (
	Istio   = Adapter{Name: "Istio", Host: "localhost"}
	Linkerd = Adapter{Name: "Linkerd", Host: "localhost"}
	Consul  = Adapter{Name: "Consul", Host: "localhost"}
	NSM     = Adapter{Name: "NSM", Host: "localhost"}
	AWS     = Adapter{Name: "AWS", Host: "localhost"}
	Traefik = Adapter{Name: "Traefik", Host: "localhost"}
	Kuma    = Adapter{Name: "Kuma", Host: "localhost"}
	OSM     = Adapter{Name: "OSM", Host: "localhost"}
	Nginx   = Adapter{Name: "Nginx", Host: "localhost"}
	Cilium  = Adapter{Name: "Cilium", Host: "localhost"}
)

var ListAvailableAdapters = []Adapter{
	{Name: "meshery-istio", Port: Istio.Port, Host: Istio.Host},
	{Name: "meshery-linkerd", Port: Linkerd.Port, Host: Linkerd.Host},
	{Name: "meshery-consul", Port: Consul.Port, Host: Consul.Host},
	{Name: "meshery-kuma", Port: Kuma.Port, Host: Kuma.Host},
	{Name: "meshery-nsm", Port: NSM.Port, Host: NSM.Host},
	{Name: "meshery-nginx-sm", Port: Nginx.Port, Host: Nginx.Host},
	{Name: "meshery-app-mesh", Port: AWS.Port, Host: AWS.Host},
	{Name: "meshery-osm", Port: OSM.Port, Host: OSM.Host},
	{Name: "meshery-cilium", Port: Cilium.Port, Host: Cilium.Host},
	{Name: "meshery-traefik-mesh", Port: Traefik.Port, Host: Traefik.Host},
}

// Adapter represents an adapter in Meshery
type Adapter struct {
	Name         string                       `json:"name"`
	Host         string                       `json:"host"`
	Port         int                          `json:"port"`
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
		// Set the availability based on custom logic (e.g., check if the adapter is running)
		ListAvailableAdapters[i].Available = CheckAdapterAvailability(ListAvailableAdapters[i])
	}
}

var availablePortMutex sync.Mutex
var nextAvailablePort = 9999

func GetNextAvailablePort() int {
	availablePortMutex.Lock()
	defer availablePortMutex.Unlock()

	nextAvailablePort++
	if nextAvailablePort >= 65535 {
		nextAvailablePort = 10000
	}
	return nextAvailablePort
}

func CheckAdapterAvailability(adapter Adapter) bool {
	if adapter.Host == "localhost" {
		// Custom logic to check if the adapter is available on localhost
		// For example, you can check if the localhost URL is pingable
		// by making a request to the adapter's port
		resp, err := http.Get("http://localhost:" + strconv.Itoa(adapter.Port))
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
