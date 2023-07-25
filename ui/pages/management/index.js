import { NoSsr } from "@material-ui/core";
import MesheryPlayComponent from "../../components/MesheryPlayComponent";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { updatepagepath } from "../../lib/store";
import Head from "next/head";
import { getPath } from "../../lib/path";

const Manage = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    console.log(`path: ${getPath()}`);
    dispatch(updatepagepath({ path : getPath() }));
  }, [dispatch]);

  return (
    <NoSsr>
      <Head>
        <title>Management | Meshery</title>
      </Head>
      <MesheryPlayComponent />
    </NoSsr>
  );
};

export default Manage;
