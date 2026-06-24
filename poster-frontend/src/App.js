import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { ClipLoader } from "react-spinners";

const override = {
  display: "block",
  margin: "0 auto",
  borderColor: "red",
};

function App() {
  const [files, setFiles] = useState([]);
  let [loading, setLoading] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [useRatio, setUseRatio] = useState(true);
  const [size, setSize] = useState("30x40");

  const onDrop = (acceptedFiles) => {
    setFiles(acceptedFiles);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true
  });

  const upload = async () => {
    const formData = new FormData();
    setLoading(true);
    setDownloadUrl(null);

    files.forEach(file => {
      formData.append("files", file);
    });

    let url = "http://localhost:8000/batch?dpi=500";

    if (useRatio) {
      const [w, h] = size.split("x");
      url += `&width_cm=${w}&height_cm=${h}`;
    }

    const res = await fetch(url, {
      method: "POST",
      body: formData
    });

    const blob = await res.blob();
    const urlBlob = window.URL.createObjectURL(blob);
    setLoading(false);
    setDownloadUrl(urlBlob);
  };

  return (
    <div style={{ padding: 30, fontFamily: "Arial" }}>
      <ClipLoader
        loading={loading}
        cssOverride={override}
        size={150}
        aria-label="Loading Spinner"
        data-testid="loader"
      />

      <h1>Poster Tool</h1>

      {/* DROPZONE */}
      <div
        {...getRootProps()}
        style={{
          border: "2px dashed #888",
          padding: 40,
          textAlign: "center",
          background: isDragActive ? "#f0f0f0" : "white",
          cursor: "pointer",
          marginBottom: 20
        }}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p>Släpp bilder här...</p>
        ) : (
          <p>Dra in bilder eller klicka för att välja</p>
        )}
      </div>

      {/* INFO */}
      <p>{files.length} bilder valda</p>

      {/* MODE */}
      <label>
        <input
          type="checkbox"
          checked={useRatio}
          onChange={(e) => setUseRatio(e.target.checked)}
        />
        {" "}Anpassa storlek
      </label>

      {useRatio && (
        <select
          value={size}
          onChange={(e) => setSize(e.target.value)}
          style={{ marginLeft: 10 }}
        >
          <option value="30x40">30×40 cm</option>
          <option value="50x70">50×70 cm</option>
        </select>
      )}

      <br /><br />

      <button onClick={upload} disabled={files.length === 0 || loading}>
        Process batch
      </button>

      <br /><br />

      {/* DOWNLOAD */}
      {downloadUrl && (
        <a href={downloadUrl} download="posters.zip">
          Ladda ner ZIP
        </a>
      )}
    </div>
  );
}

export default App;