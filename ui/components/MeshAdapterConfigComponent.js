import { useEffect, useState } from "react"
import { updateProgress } from "../lib/store"
import dataFetch from "../lib/data-fetch"
import { useSnackbar } from "notistack"
import { Chip, IconButton, Button, Tooltip } from "@material-ui/core";
// import changeAdapterState from "./graphql/mutations/AdapterStatusMutation";
import CloseIcon from "@material-ui/icons/Close"
import { useSelector } from "react-redux";
// import { iconMedium } from "../css/icons.styles";

/*
const styles = (theme) => ({
  wrapperClass : {
    padding : theme.spacing(5),
    backgroundColor : theme.palette.secondary.elevatedComponents,
    borderBottomLeftRadius : theme.spacing(1),
    borderBottomRightRadius : theme.spacing(1),
    marginTop : theme.spacing(2),
  },
  buttons : {
    display : "flex",
    justifyContent : "flex-end", paddingTop : "2rem"
  },
  button : {
    marginLeft : theme.spacing(1),
  },
  margin : { margin : theme.spacing(1), },
  alreadyConfigured : {
    textAlign : "center",
    padding : theme.spacing(20),
  },
  colorSwitchBase : {
    color : blue[300],
    "&$colorChecked" : {
      color : blue[500],
      "& + $colorBar" : { backgroundColor : blue[500], },
    },
  },
  colorBar : {},
  colorChecked : {},
  fileLabel : { width : "100%", },
  fileLabelText : {},
  inClusterLabel : { paddingRight : theme.spacing(2), },
  alignCenter : { textAlign : "center", },
  alignRight : {
    textAlign : "right",
    marginBottom : theme.spacing(2),
  },
  fileInputStyle : { opacity : "0.01", },
  icon : { width : theme.spacing(2.5), },
  istioIcon : { width : theme.spacing(1.5), },
  chip : {
    marginRight : theme.spacing(1),
    marginBottom : theme.spacing(1),
  }
});
*/

export default function MeshAdapterConfigComponent({ classes }) {
  const meshAdapters = useSelector((state) => state.get("meshAdapters"))

  // const labelRef = useRef(null);
  // const [mesheryAdapters, setMesheryAdapters] = useState(meshAdapters);
  // const [timeStamp, setTimeStamp] = useState(meshAdaptersTimeStamp);
  const [availableAdapters, setAvailableAdapters] = useState([]);
  const [setAdapterURLs, setSetAdapterURLs] = useState([]);
  // const [meshLocationURL, setMeshLocationURL] = useState("");
  // const [meshLocationURLError, setMeshLocationURLError] = useState(false);
  // const [meshDeployURLError, setMeshDeployURLError] = useState(false);
  // const [selectedAvailableAdapter, setSelectedAvailableAdapter] = useState("");
  // const [selectedAvailableAdapterError, setSelectedAvailableAdapterError] = useState(false);
  // const [meshDeployURL, setMeshDeployURL] = useState("");

  const { enqueueSnackbar, closeSnackbar } = useSnackbar

  /*
  useEffect(() => {
    if (mesheryAdapters > timeStamp) {
      setMesheryAdapters(meshAdapters)
      setTimeStamp(meshAdaptersTimeStamp)
    }
  }, [mesheryAdapters, meshAdaptersTimeStamp, timeStamp])
  */

  useEffect(() => {
    // Set initial state from meshAdapters
    setAvailableAdapters(
      meshAdapters.map((adapter) => ({
        value : adapter.adapter_location,
        label : `Meshery Adapter for ${adapter.name.toLowerCase()} (${adapter.version})`,
      }))
    );

    setSetAdapterURLs(
      meshAdapters.map((adapter) => ({
        value : adapter.adapter_location,
        label : `Mesh Adapter URL ${adapter.name}`,
      }))
    );

    // Clean up the event listener on unmount to avoid memory leaks.
    return () => {
      router.events.off("routeChangeComplete", handleRouteChange);
    };
  }, [meshAdapters]);

  useEffect(() => {
    fetchSetAdapterURLs()
    fetchAvailableAdapters()
  }, [])

  const checkAdapterPingability = async (adapterURL, adapterPort) => {
    try {
      const response = await fetch(`http://${adapterURL}:${adapterPort}`);
      return response.ok;
    } catch (error) {
      console.error(`Error checking adapter pingability: ${error}`);
      return false;
    }
  };

  const fetchAvailableAdapters = () => {
    updateProgress({ showProgress : true });
    dataFetch(
      "/api/system/availableAdapters",
      {
        method : "GET",
        credentials : "include",
      },
      async (result) => {
        updateProgress({ showProgress : false });
        console.log("Result from availableAdapters API:", result); // Log the result array
        if (typeof result !== "undefined") {
          const options = await Promise.all(
            result.map(async (res) => {
              const isPingable = await checkAdapterPingability(
                "localhost",
                res.port
              );
              console.log(
                `Adapter: ${res.name}, Port: ${res.port}`
              ); // Log the adapter details and pingability result
              return {
                value : res.port,
                label : `${res.name}:${res.port}`, // Use the combined name and port
                pingable : isPingable,
              };
            })
          );
          console.log("availableAdapters initial state: ", availableAdapters);
          console.log("List available adapters: ", options);
          setAvailableAdapters(options);
        }
      },
      handleError("Unable to fetch available adapters")
    );
  };

  const fetchSetAdapterURLs = () => {
    updateProgress({ showProgress : true });
    dataFetch(
      "/api/system/adapters",
      {
        method : "GET",
        credentials : "include",
      },
      async (result) => {
        updateProgress({ showProgress : false });
        if (typeof result !== "undefined") {
          const options = await Promise.all(
            result.map(async (res) => ({
              value : res.adapter_name,
              label : res.adapter_name + ":" + res.adapter_port,
              pingable : await checkAdapterPingability(res.adapter_name, res.adapter_port),
            }))
          );
          console.log("adaptersURLs initial state: ", setAdapterURLs);
          console.log("Set Adapter URLs:", options); // Log the fetched Set Adapter URLs
          setAdapterURLs(options);
        }
      },
      handleError("Unable to fetch available adapters")
    );
  };

  const handleError = (msg) => (error) => {
    updateProgress({ showProgress : false });
    enqueueSnackbar(`${msg}: ${error}`, {
      variant : "error",
      action : (key) => (
        <IconButton key="close" aria-label="Close" color="inherit" onClick={() => closeSnackbar(key)}>
          <CloseIcon />
        </IconButton>
      ),
      autoHideDuration : 8000,
    });
  };

  /*
  const handleChange = (name) => (event) => {
    if (name === "meshLocationURL" && event.target.value !== "") {
      setMeshLocationURLError(false);
    }
    setFormData((prevFormData) => ({ ...prevFormData, [name] : event.target.value }));
  };

  const handleMeshLocURLChange = (newValue) => {
    if (typeof newValue !== "undefined") {
      setFormData((prevFormData) => ({
        ...prevFormData,
        meshLocationURL : newValue,
        meshLocationURLError : false,
      }));
    }
  };

  const handleDeployPortChange = (newValue) => {
    if (typeof newValue !== "undefined") {
      console.log("Port change to " + newValue.value);
      setFormData((prevFormData) => ({
        ...prevFormData,
        meshDeployURL : newValue.value,
        meshDeployURLError : false,
      }));
    }
  };

  const handleAvailableAdapterChange = (newValue) => {
    if (typeof newValue !== "undefined") {
      // Trigger label animation manually
      labelRef.current.querySelector("label").classList.add("MuiInputLabel-shrink");
      setFormData((prevFormData) => ({
        ...prevFormData,
        selectedAvailableAdapter : newValue,
        selectedAvailableAdapterError : false,
        meshDeployURL : newValue !== null ? newValue.value : prevFormData.meshDeployURL,
        meshDeployURLError : false,
      }));
    }
  };

  const handleSubmit = () => {
    const { meshLocationURL } = formData;

    if (!meshLocationURL || !meshLocationURL.value || meshLocationURL.value === "") {
      setMeshLocationURLError(true);
      return;
    }

    submitConfig();
  };

  const submitConfig = () => {
    const { meshLocationURL } = formData;

    const data = { meshLocationURL : meshLocationURL.value };

    const params = Object.keys(data)
      .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`)
      .join("&");

    updateProgress({ showProgress : true });
    dataFetch(
      "/api/system/adapter/manage",
      {
        method : "POST",
        credentials : "include",
        headers : { "Content-Type" : "application/x-www-form-urlencoded;charset=UTF-8" },
        body : params,
      },
      (result) => {
        updateProgress({ showProgress : false });
        if (typeof result !== "undefined") {
          setFormData((prevFormData) => ({
            ...prevFormData,
            meshAdapters : result,
            meshLocationURL : "",
          }));
          enqueueSnackbar("Adapter was configured!", {
            variant : "success",
            "data-cy" : "adapterSuccessSnackbar",
            autoHideDuration : 2000,
            action : (key) => (
              <IconButton key="close" aria-label="Close" color="inherit" onClick={() => closeSnackbar(key)}>
                <CloseIcon style={iconMedium} />
              </IconButton>
            ),
          });
          updateAdaptersInfo({ meshAdapters : result });
          fetchSetAdapterURLs();
        }
      },
      handleError("Adapter was not configured due to an error")
    );
  };

  const handleDelete = (adapterLoc) => () => {
    updateProgress({ showProgress : true });
    dataFetch(
            `/api/system/adapter/manage?adapter=${encodeURIComponent(adapterLoc)}`,
            {
              method : "DELETE",
              credentials : "include",
            },
            (result) => {
              updateProgress({ showProgress : false });
              if (typeof result !== "undefined") {
                setFormData((prevFormData) => ({
                  ...prevFormData,
                  meshAdapters : result,
                }));
                enqueueSnackbar("Adapter was removed!", {
                  variant : "success",
                  autoHideDuration : 2000,
                  action : (key) => (
                    <IconButton key="close" aria-label="Close" color="inherit" onClick={() => closeSnackbar(key)}>
                      <CloseIcon />
                    </IconButton>
                  ),
                });
                updateAdaptersInfo({ meshAdapters : result });
              }
            },
            handleError("Adapter was not removed due to an error")
    );
  };

  const handleClick = (adapterLoc) => () => {
    updateProgress({ showProgress : true });
    dataFetch(
            `/api/system/adapters?adapter=${encodeURIComponent(adapterLoc)}`,
            {
              credentials : "include",
            },
            (result) => {
              updateProgress({ showProgress : false });
              if (typeof result !== "undefined") {
                enqueueSnackbar("Adapter was pinged!", {
                  variant : "success",
                  autoHideDuration : 2000,
                  action : (key) => (
                    <IconButton key="close" aria-label="Close" color="inherit" onClick={() => closeSnackbar(key)}>
                      <CloseIcon />
                    </IconButton>
                  ),
                });
              }
            },
            handleError("error")
    );
  };

  const handleAdapterDeploy = () => {
    const { selectedAvailableAdapter, meshDeployURL } = this.state;

    if (!selectedAvailableAdapter || !selectedAvailableAdapter.value || selectedAvailableAdapter.value === "") {
      setSelectedAvailableAdapterError(true);
      return;
    }

    if (!meshDeployURL || meshDeployURL === "") {
      console.log(meshDeployURL);
      setMeshDeployURLError(true);
      return;
    }

    updateProgress({ showProgress : true });

    const variables = {
      status : "ENABLED",
      adapter : selectedAvailableAdapter.label,
      targetPort : meshDeployURL,
    };

    changeAdapterState((response, errors) => {
      updateProgress({ showProgress : false });

      if (errors !== undefined) {
        handleError("Unable to Deploy adapter");
      }
      enqueueSnackbar("Adapter " + response.adapterStatus.toLowerCase(), {
        variant : "success",
        autoHideDuration : 2000,
        action : (key) => (
          <IconButton key="close" aria-label="Close" color="inherit" onClick={() => closeSnackbar(key)}>
            <CloseIcon style={iconMedium} />
          </IconButton>
        ),
      });
    }, variables);
  };

  const handleAdapterUndeploy = () => {
    const { meshLocationURL } = this.state;

    if (!meshLocationURL || !meshLocationURL.value || meshLocationURL.value === "") {
      setMeshLocationURLError(true);
      return;
    }

    updateProgress({ showProgress : true });

    const targetPort = function getTargetPort(location) {
      if (!location.value) {
        return null;
      }

      if (location.value.includes(":")) {
        return location.value.split(":")[1];
      }

      return location.value;
    }(meshLocationURL);

    const variables = {
      status : "DISABLED",
      adapter : "",
      targetPort,
    };

    changeAdapterState((response, errors) => {
      updateProgress({ showProgress : false });

      if (errors !== undefined) {
        handleError("Unable to Deploy adapter");
      }
      enqueueSnackbar("Adapter " + response.adapterStatus.toLowerCase(), {
        variant : "success",
        autoHideDuration : 2000,
        action : (key) => (
          <IconButton key="close" aria-label="Close" color="inherit" onClick={() => closeSnackbar(key)}>
            <CloseIcon style={iconMedium} />
          </IconButton>
        ),
      });
    }, variables);
  };

  const configureTemplate = () => {
    const { classes } = props;
    const {
      availableAdapters, setAdapterURLs, meshAdapters, meshLocationURL, meshLocationURLError, meshDeployURLError, selectedAvailableAdapter, selectedAvailableAdapterError, meshDeployURL
    } = useState();

    let showAdapters = "";
    if (meshAdapters.length > 0) {
      showAdapters = (
        <div className={classes.alignRight}>
          {meshAdapters.map((adapter) => {
            let image = "/static/img/meshery-logo.png";
            let logoIcon = <img src={image} className={classes.icon} />;
            if (adapter.name) {
              image = "/static/img/" + adapter.name.toLowerCase() + ".svg";
              logoIcon = <img src={image} className={classes.icon} />;
            }

            return (
              <Tooltip
                key={adapter.uniqueID}
                title={
                                    `Meshery Adapter for
                                    ${adapter.name
                                      .toLowerCase()
                                      .split(" ")
                                      .map((s) => s.charAt(0).toUpperCase() + s.substring(1))
                                      .join(" ")} (${adapter.version})`}>
                <Chip
                  className={classes.chip}
                  label={adapter.adapter_location}
                  onDelete={handleDelete(adapter.adapter_location)}
                  onClick={handleClick(adapter.adapter_location)}
                  icon={logoIcon}
                  variant="outlined"
                  data-cy="chipAdapterLocation"
                />
              </Tooltip>
            );
          })}
        </div>
      );
    }
  };
  */

  const renderAdapters = () => {
    if (meshAdapters.length === 0) {
      return (
        <div className={classes.alreadyConfigured}>
          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={handleConfigure}
          >
            Configure Settings
          </Button>
        </div>
      );
    }

    return (
      <div className={classes.alignRight}>
        {meshAdapters.map((adapter) => {
          let image = "/static/img/meshery-logo.png";
          let logoIcon = <img src={image} className={classes.icon} />;
          if (adapter.name) {
            image = `/static/img/${adapter.name.toLowerCase()}.svg`;
            logoIcon = <img src={image} className={classes.icon} />;
          }

          return (
            <Tooltip
              key={adapter.uniqueID}
              title={`Meshery Adapter for ${adapter.name
                .toLowerCase()
                .split(" ")
                .map((s) => s.charAt(0).toUpperCase() + s.substring(1))
                .join(" ")} (${adapter.version})`}
            >
              <Chip
                className={classes.chip}
                label={adapter.adapter_port}
                onDelete={handleDelete(adapter.adapter_port)}
                onClick={handleClick(adapter.adapter_port)}
                icon={logoIcon}
                variant="outlined"
                data-cy="chipAdapterLocation"
              />
            </Tooltip>
          );
        })}
      </div>
    );
  };

  return (
    <div></div>
  )
}