/** @type {import('next').NextConfig} */
const nextConfig = {
  // Autoriser les origines de développement locales courantes pour HMR
  // Cela évite des erreurs Cross-Origin lors du développement sur le réseau
  // (par exemple lorsque Next choisit un port différent ou qu'on accède via l'IP)
  experimental: {},
  allowedDevOrigins: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    // Ajoutez votre IP réseau locale utilisée par Next (ex. affichée dans le log Next)
    'http://192.168.1.64:3000',
    'http://192.168.1.64:3001',
  ],
}

module.exports = nextConfig
