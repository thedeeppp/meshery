package handlers

import (
	"net/http"
	"time"

	"encoding/json"

	"github.com/layer5io/meshery/server/models"
)

type SessionSyncData struct {
	*models.Preference `json:",inline"`
	K8sConfigs         []SessionSyncDataK8sConfig `json:"k8sConfig,omitempty"`
}

type SessionSyncDataK8sConfig struct {
	ContextID         string     `json:"id,omitempty"`
	ContextName       string     `json:"name,omitempty"`
	ClusterConfigured bool       `json:"clusterConfigured,omitempty"`
	ConfiguredServer  string     `json:"server,omitempty"`
	ClusterID         string     `json:"clusterID,omitempty"`
	CreatedAt         *time.Time `json:"created_at,omitempty"`
	UpdatedAt         *time.Time `json:"updated_at,omitempty"`
}

// swagger:route GET /api/system/sync SystemAPI idSystemSync
// Handle GET request for config sync
//
// Used to send session data to the UI for initial sync
// responses:
// 	200: userLoadTestPrefsRespWrapper

// SessionSyncHandler is used to send session data to the UI for initial sync
func (h *Handler) SessionSyncHandler(w http.ResponseWriter, r *http.Request) {
	prefObj := &models.Preference{} // Initialize prefObj
	// h.log.Debugf("Preference object: %+v", prefObj)

	var user *models.User
	var provider models.Provider

	_, _ = provider.GetUserDetails(r)

	meshAdapters := []*models.Adapter{}

	adapters := h.config.AdapterTracker.GetAdapters(r.Context())
	for _, adapter := range adapters {
		meshAdapters, _ = h.addAdapter(r.Context(), meshAdapters, prefObj, adapter.Location, provider)
	}

	h.log.Debug("final list of active adapters: ", meshAdapters)
	prefObj.MeshAdapters = meshAdapters
	err := provider.RecordPreferences(r, user.UserID, prefObj)
	if err != nil { // ignoring errors in this context
		// h.log.Errorf("Error saving session: %v", err)
	}
	s := []SessionSyncDataK8sConfig{}
	k8scontexts, ok := r.Context().Value(models.AllKubeClusterKey).([]models.K8sContext)
	if ok {
		for _, k8scontext := range k8scontexts {
			var cid string
			if k8scontext.KubernetesServerID != nil {
				cid = k8scontext.KubernetesServerID.String()
			}
			s = append(s, SessionSyncDataK8sConfig{
				ContextID:         k8scontext.ID,
				ContextName:       k8scontext.Name,
				ClusterConfigured: true,
				ClusterID:         cid,
				ConfiguredServer:  k8scontext.Server,
				CreatedAt:         k8scontext.CreatedAt,
				UpdatedAt:         k8scontext.UpdatedAt,
			})
		}
	}
	data := SessionSyncData{
		Preference: prefObj,
		K8sConfigs: s,
	}

	err = json.NewEncoder(w).Encode(data)
	if err != nil {
		// obj := "user config data"
		// h.log.Errorf("Error marshaling %s: %v", obj, err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}
}
