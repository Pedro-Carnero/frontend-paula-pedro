<<<<<<< HEAD
import React from "react";
import ReactDOM from "react-dom/client";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      div: any;
    }
    type Element = any;
  }
}

function VideoEditor(): JSX.Element {
  return <div>VideoEditor placeholder</div>;
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <VideoEditor />
);
=======
import React from "react";
import ReactDOM from "react-dom/client";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      div: any;
    }
    type Element = any;
  }
}

function VideoEditor(): JSX.Element {
  return <div>VideoEditor placeholder</div>;
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <VideoEditor />
);
>>>>>>> 42814644ddbdef58ca91db3d9ed0499cc03b4166
