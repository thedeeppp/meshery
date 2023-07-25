import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import NoSsr from "@material-ui/core/NoSsr";
import { withStyles, Button, Divider, MenuItem, TextField, Grid } from "@material-ui/core";
import { blue } from "@material-ui/core/colors";
import PropTypes from "prop-types";
import { useRouter } from "next/router";
import SettingsIcon from "@material-ui/icons/Settings";
import MesheryAdapterPlayComponent from "./MesheryAdapterPlayComponent";
import { setAdapter } from "../lib/store";

const styles = (theme) => ({
  icon : {
    fontSize : 23,
    width : theme.spacing(2.5),
    marginRight : theme.spacing(0.5),
    alignSelf : "flex-start"
  },
  playRoot : {
    padding : theme.spacing(0),
    marginBottom : theme.spacing(2),
  },
  buttons : {
    display : "flex",
    justifyContent : "flex-end",
  },
  button : {
    marginTop : theme.spacing(3),
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
  uploadButton : {
    margin : theme.spacing(1),
    marginTop : theme.spacing(3),
  },
  fileLabel : { width : "100%", },
  editorContainer : { width : "100%", },
  deleteLabel : { paddingRight : theme.spacing(2), },
  alignRight : { textAlign : "right", },
  expTitleIcon : {
    width : theme.spacing(3),
    display : "inline",
    verticalAlign : "middle",
  },
  expIstioTitleIcon : {
    width : theme.spacing(2),
    display : "inline",
    verticalAlign : "middle",
    marginLeft : theme.spacing(0.5),
    marginRight : theme.spacing(0.5),
  },
  expTitle : {
    display : "inline",
    verticalAlign : "middle",
    marginLeft : theme.spacing(1),
  },
  paneSection : {
    backgroundColor : theme.palette.secondary.elevatedComponents,
    padding : theme.spacing(2.5),
    borderRadius : 4,
  },
});

const MesheryPlayComponent = ({ classes }) => {
  const router = useRouter();
  const dispatch = useDispatch();

  const meshAdapters = useSelector((state) => state.get("meshAdapters"));
  const selectedAdapter = useSelector((state) => state.get("selectedAdapter"));

  let adapter = {}

  useEffect(() => {
    // Set the initial adapter state based on the provided selectedAdapter prop.
    setAdapter(selectedAdapter);
  }, [selectedAdapter]);

  const handleRouteChange = () => {
    const queryParam = router.query?.adapter;
    if (queryParam) {
      const selectedAdapter = meshAdapters.find(({ adapter_port }) => adapter_port === queryParam);
      if (selectedAdapter) {
        setAdapter(selectedAdapter);
      }
    }
  };

  useEffect(() => {
    // Add event listener for route change to handle adapter selection from query parameters.
    router.events.on("routeChangeComplete", handleRouteChange);

    // Clean up the event listener on unmount to avoid memory leaks.
    return () => {
      router.events.off("routeChangeComplete", handleRouteChange);
    };
  }, [router]);

  const handleAdapterChange = (event) => {
    if (event.target.value !== "") {
      const selectedAdapter = meshAdapters.find(({ adapter_port }) => adapter_port === event.target.value);
      if (selectedAdapter) {
        setAdapter(selectedAdapter);
        dispatch(setAdapter({ selectedAdapter : selectedAdapter.name }));
      }
    }
  };

  const handleConfigure = () => {
    router.push("/settings#service-mesh");
  };

  const pickImage = (adapter) => {
    let image = "/static/img/meshery-logo.png";
    if (adapter && adapter.name) {
      image = `/static/img/${adapter.name.toLowerCase()}.svg`;
    }
    return <img src={image} className={classes.expTitleIcon} />;
  };

  const renderIndividualAdapter = () => {
    let adapCount = 0;
    meshAdapters.forEach((adap) => {
      if (adap.adapter_port === adapter.adapter_port) {
        meshAdapters.forEach((ad) => {
          if (ad.name === adap.name) adapCount += 1;
        });
      }
    });
    if (adapter) {
      const imageIcon = pickImage(adapter);
      return (
        <React.Fragment>
          <MesheryAdapterPlayComponent adapter={adapter} adapCount={adapCount} adapter_icon={imageIcon} />
        </React.Fragment>
      );
    }
    return null;
  };

  console.log("meshAdapters:", meshAdapters);
  console.log("selectedAdapter:", selectedAdapter);

  if (meshAdapters.size === 0) {
    return (
      <NoSsr>
        <React.Fragment>
          <div className={classes.alreadyConfigured}>
            <Button variant="contained" color="primary" size="large" onClick={handleConfigure}>
              <SettingsIcon className={classes.icon} />
              Configure Settings
            </Button>
          </div>
        </React.Fragment>
      </NoSsr>
    );
  }

  if (adapter && adapter !== "") {
    const indContent = renderIndividualAdapter();
    if (indContent !== null) {
      return indContent;
    }
    // else it will render all the available adapters
  }

  return (
    <NoSsr>
      <React.Fragment>
        <div className={classes.playRoot}>
          <Grid container>
            <Grid item xs={12} className={classes.paneSection}>
              <TextField
                select
                id="adapter_id"
                name="adapter_name"
                label="Select Service Mesh Type"
                fullWidth
                value={adapter && adapter.adapter_port ? adapter.adapter_port : ""}
                margin="normal"
                variant="outlined"
                onChange={handleAdapterChange}
                SelectProps={{
                  MenuProps : {
                    anchorOrigin : {
                      vertical : "bottom",
                      horizontal : "left",
                    },
                    transformOrigin : {
                      vertical : "top",
                      horizontal : "left",
                    },
                    getContentAnchorEl : null,
                  },
                }}
              >
                {meshAdapters.map((ada) => (
                  <MenuItem key={`${ada.adapter_port}_${new Date().getTime()}`} value={ada.adapter_port}>
                    {pickImage(ada)}
                    <span className={classes.expTitle}>{ada.adapter_port}</span>
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>
        </div>
        <Divider variant="fullWidth" light />
        {adapter && adapter.adapter_port && (
          <MesheryAdapterPlayComponent adapter={adapter} adapter_icon={pickImage(adapter)} />
        )}
      </React.Fragment>
    </NoSsr>
  );
};

MesheryPlayComponent.propTypes = {
  classes : PropTypes.object.isRequired,
};

export default withStyles(styles)(MesheryPlayComponent);