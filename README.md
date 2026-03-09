# webgl-medical-volume-visualizer
Interactive WebGL viewer for medical volumetric datasets in the browser.

A web application for interactive visualization of medical volumetric datasets directly in the browser.
The system uses **WebGL 2.0** to render CT data as 3D volumes and provides tools for exploration and analysis.

## Technologies

* JavaScript
* WebGL 2.0
* HTML / CSS
* LiteGL
* Rendeer

## Supported Data Formats

* DICOM (.dcm)
* NIFTI (.nii)
* MetaImage (.mha)

## Features

* Interactive 3D volume visualization
* Transfer function editor for visualization control
* Camera controls (zoom, rotate, reset)
* Optional segmented volume loading
* GPU-based rendering using 3D textures

## Usage

Open `app.html` in a modern browser (Chrome or Firefox recommended) and load a supported dataset.

## Project Structure

```
app.html          # Entry point of the application
visualizer.html     # Main visualization interface
js/                 # Rendering core, volume processing, and utilities
css/                # Interface styling
js/lib/             # External libraries (LiteGL, Rendeer, parsers)
```


