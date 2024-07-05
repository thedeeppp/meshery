package model

import (
	"bytes"
	"compress/gzip"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/layer5io/meshery/mesheryctl/internal/cli/root/config"
	"github.com/layer5io/meshery/mesheryctl/pkg/utils"
	"github.com/layer5io/meshery/server/models"
	meshkitutils "github.com/layer5io/meshkit/utils"
	"github.com/spf13/cobra"
	"github.com/spf13/pflag"
	"github.com/spf13/viper"
)

var importModelCmd = &cobra.Command{
	Use:   "import",
	Short: "import models from mesheryctl command",
	Long:  "import model by specifying the directory, file, or OCI image. Use 'import model --file [filepath]' or 'import model --dir [directory]' or 'import model --oci [image]' to import models and register them to Meshery.",
	Example: `
	import model --file /path/to/[file.yaml|file.json]
	import model --dir /path/to/models
	import model --oci docker://example.com/repo:tag
	`,
	PreRunE: func(cmd *cobra.Command, args []string) error {
		// Check prerequisites
		mctlCfg, err := config.GetMesheryCtl(viper.GetViper())
		if err != nil {
			return err
		}
		err = utils.IsServerRunning(mctlCfg.GetBaseMesheryURL())
		if err != nil {
			return err
		}
		ctx, err := mctlCfg.GetCurrentContext()
		if err != nil {
			return err
		}
		err = ctx.ValidateVersion()
		if err != nil {
			return err
		}
		return nil
	},
	RunE: func(cmd *cobra.Command, args []string) error {
		filePath, err := cmd.Flags().GetString("file")
		if err != nil {
			return err
		}
		dirPath, err := cmd.Flags().GetString("dir")
		if err != nil {
			return err
		}
		ociImage, err := cmd.Flags().GetString("oci")
		if err != nil {
			return err
		}
		fmt.Println(filePath)
		if filePath == "" && dirPath == "" && ociImage == "" {
			return fmt.Errorf("either file path, directory, or OCI image is required")
		}

		if filePath != "" {
			if meshkitutils.IsYaml(filePath) {
				fileData, err := os.ReadFile(filePath)
				if err != nil {
					return err
				}
				fmt.Println("isyaml")
				err = sendToAPI(fileData, filePath, "file")
				if err != nil {
					return err
				}
			} else if meshkitutils.IsTarGz(filePath) || meshkitutils.IsZip(filePath) {
				fileData, err := os.ReadFile(filePath)
				if err != nil {
					return err
				}
				err = sendToAPI(fileData, filePath, "dir")
				if err != nil {
					return err
				}
			} else {
				return fmt.Errorf("unsupported file type: %s", filePath)
			}
		}

		if dirPath != "" {
			tarData, err := compressDirectory(dirPath)
			if err != nil {
				return err
			}
			fileName := filepath.Base(dirPath) + ".tar.gz"
			err = sendToAPI(tarData, fileName, "dir")
			if err != nil {
				return err
			}
		}

		if ociImage != "" {
			err := sendToAPI([]byte(ociImage), ociImage, "oci")
			if err != nil {
				return err
			}
		}

		return nil
	},
}

func compressDirectory(dirpath string) ([]byte, error) {
	tw := meshkitutils.NewTarWriter()
	defer tw.Close()

	err := filepath.Walk(dirpath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		if info.IsDir() {
			return nil
		}

		file, err := os.Open(path)
		if err != nil {
			return err
		}
		defer file.Close()

		fileData, err := io.ReadAll(file)
		if err != nil {
			return err
		}

		relPath, err := filepath.Rel(filepath.Dir(dirpath), path)
		if err != nil {
			return err
		}

		if err := tw.Compress(relPath, fileData); err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	var buf bytes.Buffer
	gzipWriter := gzip.NewWriter(&buf)
	_, err = io.Copy(gzipWriter, tw.Buffer)
	if err != nil {
		return nil, err
	}
	if err := gzipWriter.Close(); err != nil {
		return nil, err
	}

	return buf.Bytes(), nil
}

func sendToAPI(data []byte, name string, dataType string) error {
	mctlCfg, err := config.GetMesheryCtl(viper.GetViper())
	if err != nil {
		utils.Log.Error(err)
		return err
	}

	baseURL := mctlCfg.GetBaseMesheryURL()
	url := baseURL + "/api/meshmodels/registers"
	fmt.Println(url)
	var b bytes.Buffer
	writer := multipart.NewWriter(&b)

	var formFile io.Writer
	if dataType == "file" {
		formFile, err = writer.CreateFormFile("file", filepath.Base(name))
	} else if dataType == "oci" {
		formFile, err = writer.CreateFormField("oci")
	} else {
		formFile, err = writer.CreateFormField("dir")
	}

	if err != nil {
		utils.Log.Error(fmt.Errorf("failed to create form field: %w", err))
		return err
	}

	_, err = formFile.Write(data)
	if err != nil {
		utils.Log.Error(fmt.Errorf("failed to write data to form field: %w", err))
		return err
	}

	err = writer.Close()
	if err != nil {
		utils.Log.Error(fmt.Errorf("failed to close writer: %w", err))
		return err
	}

	req, err := utils.NewRequest(http.MethodPost, url, &b)
	if err != nil {
		utils.Log.Error(fmt.Errorf("failed to create request: %w", err))
		return err
	}
	req.Header.Set("Content-Type", writer.FormDataContentType())
	resp, err := utils.MakeRequest(req)
	if err != nil {
		utils.Log.Error(fmt.Errorf("failed to send request: %w", err))
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		err = models.ErrDoRequest(err, resp.Request.Method, url)
		utils.Log.Error(err)
		return err
	}
	utils.Log.Info("Models imported successfully")
	return nil
}

func init() {
	importModelCmd.Flags().SetNormalizeFunc(func(f *pflag.FlagSet, name string) pflag.NormalizedName {
		return pflag.NormalizedName(strings.ToLower(name))
	})
	importModelCmd.Flags().StringP("file", "f", "", "Filepath to the tar.gz file containing models")
	importModelCmd.Flags().StringP("dir", "d", "", "Directory containing models to be tar.gz")
	importModelCmd.Flags().StringP("oci", "o", "", "OCI image containing models")
}
