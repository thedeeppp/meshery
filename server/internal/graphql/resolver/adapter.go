package resolver

import (
	"context"
	"fmt"
	"strings"

	"github.com/layer5io/meshery/server/helpers"
	"github.com/layer5io/meshery/server/helpers/utils"
	"github.com/layer5io/meshery/server/internal/graphql/model"
	"github.com/layer5io/meshery/server/models"
)

func getAdapterInformationByName(adapterName string) *models.Adapter {
	var adapter *models.Adapter

	for _, v := range models.ListAvailableAdapters {
		if adapterName == v.Name {
			adapter = &v
		}
	}

	return adapter
}
func (r *Resolver) changeAdapterStatus(_ context.Context, _ models.Provider, targetStatus model.Status, adapterName, targetPort string) (model.Status, error) {
	// Check if the adapter name or target port is provided
	if adapterName == "" && targetPort == "" {
		return model.StatusUnknown, helpers.ErrAdapterInsufficientInformation(fmt.Errorf("either the adapter name or target port is not provided, please provide the name of the adapter or target port to perform the operation"))
	}

	// In case the target port is empty, select the default port from the adapter
	if targetPort == "" {
		r.Log.Warn(fmt.Errorf("target port is not specified in the request body, searching for default ports"))
		selectedAdapter := getAdapterInformationByName(adapterName)
		if selectedAdapter == nil {
			return model.StatusUnknown, helpers.ErrAdapterInsufficientInformation(fmt.Errorf("adapter name is not available, unable to determine the target port"))
		}

		targetPort = selectedAdapter.Port
	}

	platform := utils.GetPlatform()
	if platform == "kubernetes" {
		r.Log.Info("Feature for Kubernetes is disabled")
		return model.StatusDisabled, nil
	}

	var adapter models.Adapter

	// Check if the target port is "localhost:port" or "name:port" format
	if strings.HasPrefix(targetPort, "localhost:") {
		r.Log.Info("Deploying/Undeploying adapter with localhost target")

		adapter = models.Adapter{
			Name: adapterName,
			Host: "localhost",
			Port: extractPortFromTarget(targetPort),
		}
	} else {
		r.Log.Info("Deploying/Undeploying adapter with name target")

		adapter = models.Adapter{
			Name: adapterName,
			Host: extractNameFromTarget(targetPort),
			Port: extractPortFromTarget(targetPort),
		}
	}

	deleteAdapter := true

	if targetStatus == model.StatusEnabled {
		r.Log.Info("Deploying Adapter")
		deleteAdapter = false
	} else {
		r.Log.Info("Undeploying Adapter")
	}

	r.Log.Debug(fmt.Printf("changing adapter status of %s on port %s to status %s\n", adapterName, targetPort, targetStatus))

	go func(routineCtx context.Context, del bool) {
		var operation string
		if del {
			operation = "Undeploy"
			err = r.Config.AdapterTracker.UndeployAdapter(routineCtx, adapter)
		} else {
			operation = "Deploy"
			err = r.Config.AdapterTracker.DeployAdapter(routineCtx, adapter)
		}
		if err != nil {
			r.Log.Info("Failed to " + operation + " adapter")
			r.Log.Error(err)
		} else {
			r.Log.Info("Successfully " + operation + "ed adapter")
		}
	}(context.Background(), deleteAdapter)

	return model.StatusProcessing, nil
}

func extractNameFromTarget(target string) string {
	parts := strings.Split(target, ":")
	if len(parts) > 1 {
		return parts[0]
	}
	return ""
}

func extractPortFromTarget(target string) string {
	parts := strings.Split(target, ":")
	if len(parts) > 1 {
		return parts[1]
	}
	return ""
}
