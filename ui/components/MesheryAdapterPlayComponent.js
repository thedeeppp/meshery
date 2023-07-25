import { Grid, Chip, IconButton, NoSsr, withStyles, Typography } from "@material-ui/core";
import { updateProgress } from "../lib/store";
import CloseIcon from "@material-ui/icons/Close";
import iconMedium from "../css/icons.styles";
import { Fragment, useEffect, useState } from "react";
import { useSnackbar } from "notistack";
import { blue } from "@material-ui/core/colors";
import dataFetch from "../lib/data-fetch";
import MesheryResultDialog from "./MesheryResultDialog";
import ReactSelectWrapper from "./ReactSelectWrapper";

const styles = (theme) => ({
  smWrapper : { backgroundColor : theme.palette.secondary.elevatedComponents2, },
  buttons : { width : "100%", },
  button : {
    marginTop : theme.spacing(3),
    marginLeft : theme.spacing(1),
  },
  margin : { margin : theme.spacing(1), },
  alreadyConfigured : {
    textAlign : "center",
    padding : theme.spacing(20),
  },
  chip : {
    height : "50px",
    fontSize : "15px",
    position : "relative",
    top : theme.spacing(0.5),
    [theme.breakpoints.down("md")] : { fontSize : "12px", },
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
  alignLeft : {
    textAlign : "left",
    marginLeft : theme.spacing(1),
  },
  padLeft : { paddingLeft : theme.spacing(0.25), },
  padRight : { paddingRight : theme.spacing(0.25), },
  deleteRight : { float : "right", },
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
  },
  icon : { width : theme.spacing(2.5), },
  tableHeader : {
    fontWeight : "bolder",
    fontSize : 18,
  },
  secondaryTable : {
    borderRadius : 10,
    backgroundColor : "#f7f7f7",
  },
  paneSection : {
    backgroundColor : theme.palette.secondary.elevatedComponents,
    padding : theme.spacing(3),
    borderRadius : 4,
  },
  chipNamespace : {
    gap : '2rem',
    margin : "0px",
  },
  cardMesh : { margin : "-8px 0px", },
  inputContainer : {
    flex : '1',
    minWidth : '250px'
  },
  card : {
    height : '100%',
    display : 'flex',
    flexDirection : 'column'
  },
  ctxIcon : {
    display : 'inline',
    verticalAlign : 'text-top',
    width : theme.spacing(2.5),
    marginLeft : theme.spacing(0.5),
  },
  ctxChip : {
    backgroundColor : "white",
    cursor : "pointer",
    marginRight : theme.spacing(1),
    marginLeft : theme.spacing(1),
    marginBottom : theme.spacing(1),
    height : "100%",
    padding : theme.spacing(0.5)
  },
  text : {
    padding : theme.spacing(1)
  }
});

const MesheryAdapterPlayComponent = ({ adapter, classes }) => {
  // const [namespace, setNamespace] = useState('');
  // const [namespaceError, setNamespaceError] = useState(false);
  const [selectedRowData, setSelectedRowData] = useState({});
  // const [namespaceList, setNamespaceList] = useState([]);

  const { enqueueSnackbar, closeSnackbar } = useSnackbar

  useEffect(() => {
    if (adapter && adapter.name) {
      let adapterName = adapter.name.split(' ').join('').toLowerCase();
      let imageSrc = `/static/img/${adapterName}.svg`;
      let adapterChip = (
        <Chip
          label={adapter.adapter_port}
          onClick={handleAdapterClick(adapter.adapter_port)}
          icon={<img src={imageSrc} className={classes.icon} />}
          className={classes.chip}
          variant="outlined"
        />
      );
    }
    // Filtered ops logic
    const filteredOps = [];
    if (adapter && adapter.ops && adapter.ops.length > 0) {
      adapter.ops.forEach(({ category }) => {
        if (typeof category === 'undefined') {
          category = 0;
        }
        if (filteredOps.indexOf(category) === -1) {
          filteredOps.push(category);
        }
      });
      filteredOps.sort();
      // Use the filteredOps or do something with it
    }
  }, [adapter, classes]);

  const handleError = () => {
    updateProgress({ showProgress : false })
    enqueueSnackbar(`Operation submission failed: ${error}`, {
      variant : "error",
      action : (key) => (
        <IconButton key="close" aria-label="Close" color="inherit" onClick={() => closeSnackbar(key)}>
          <CloseIcon style={iconMedium} />
        </IconButton>
      )
    })
  }

  const handleAdapterClick = (adapterLoc) => () => {
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
            action : (key) => (
              <IconButton key="close" aria-label="Close" color="inherit" onClick={() => closeSnackbar(key)}>
                <CloseIcon />
              </IconButton>
            ),
            autoHideDuration : 8000,
          });
        }
      },
      handleError("error")
    );
  };

  const resetSelectedRowData = () => {
    setSelectedRowData(null);
  }

  return (
    <NoSsr>
      {selectedRowData && selectedRowData !== null && Object.keys(selectedRowData).length > 0 && (
        <MesheryResultDialog rowData={selectedRowData} close={resetSelectedRowData()} />
      )}
      <Fragment>
        <div className={classes.smWrapper}>
          <Grid container spacing={2} direction="row" alignItems="flex-start">
            <Grid item xs={12}>
              <div className={classes.paneSection}>
                <Typography align="left" variant="h6" style={{ margin : "0 0 2.5rem 0", }}>
                  Manage Service Mesh
                </Typography>
                <Grid container spacing={4}>
                  <Grid container item xs={12} alignItems="flex-start" className={classes.chipNamespace}>
                    <div>
                      {adapterChip}
                    </div>
                    <div className={classes.inputContainer}>
                      <ReactSelectWrapper
                        label="Namespace"
                        value={namespace}
                        error={namespaceError}
                        options={namespaceList}
                      // onChange={handleNamespaceChange}
                      />
                    </div>
                  </Grid>

                </Grid>
              </div>
            </Grid>
          </Grid>
        </div>
      </Fragment>
    </NoSsr>

  )
}

export default withStyles(styles)(MesheryAdapterPlayComponent);