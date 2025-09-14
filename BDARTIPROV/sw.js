self.addEventListener("install", (event) => {
  console.log("SW instalado");
});

self.addEventListener("activate", (event) => {
  console.log("SW activado");
});
