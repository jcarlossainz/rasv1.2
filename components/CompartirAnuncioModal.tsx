'use client'

import { useState } from 'react'

interface CompartirAnuncioModalProps {
  isOpen: boolean
  onClose: () => void
  propiedadId: string
  propiedadNombre: string
}

export default function CompartirAnuncioModal({ 
  isOpen, 
  onClose, 
  propiedadId, 
  propiedadNombre 
}: CompartirAnuncioModalProps) {
  
  const [copiado, setCopiado] = useState(false)
  
  if (!isOpen) return null

  const urlAnuncio = `${window.location.origin}/anuncio/${propiedadId}`
  const urlQR = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(urlAnuncio)}`

  const copiarLink = () => {
    navigator.clipboard.writeText(urlAnuncio).then(() => {
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    })
  }

  const compartirWhatsApp = () => {
    const mensaje = `¡Mira esta propiedad! 🏠\n\n*${propiedadNombre}*\n\n${urlAnuncio}`
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(mensaje)}`
    window.open(whatsappUrl, '_blank')
  }

  const compartirFacebook = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(urlAnuncio)}`
    window.open(facebookUrl, '_blank', 'width=600,height=400')
  }

  const compartirTwitter = () => {
    const texto = `¡Mira esta propiedad! 🏠 ${propiedadNombre}`
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(texto)}&url=${encodeURIComponent(urlAnuncio)}`
    window.open(twitterUrl, '_blank', 'width=600,height=400')
  }

  const compartirLinkedIn = () => {
    const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(urlAnuncio)}`
    window.open(linkedinUrl, '_blank', 'width=600,height=400')
  }

  const compartirEmail = () => {
    const asunto = `Propiedad: ${propiedadNombre}`
    const cuerpo = `Te comparto esta propiedad que podría interesarte:\n\n${propiedadNombre}\n\n${urlAnuncio}`
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`
    window.location.href = mailtoUrl
  }

  const descargarQR = () => {
    const link = document.createElement('a')
    link.href = urlQR
    link.download = `QR-${propiedadNombre.replace(/\s+/g, '-')}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-500 to-pink-500 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="18" cy="5" r="3"/>
                  <circle cx="6" cy="12" r="3"/>
                  <circle cx="18" cy="19" r="3"/>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Compartir Anuncio</h2>
                <p className="text-white/80 text-sm">{propiedadNombre}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-all"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          
          {/* Link del anuncio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🔗 Link del anuncio
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={urlAnuncio}
                readOnly
                className="flex-1 px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg font-mono text-sm"
              />
              <button
                onClick={copiarLink}
                className={`px-6 py-3 rounded-lg font-medium transition-all ${
                  copiado 
                    ? 'bg-green-500 text-white' 
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                {copiado ? '✓ Copiado' : 'Copiar'}
              </button>
            </div>
          </div>

          {/* Redes sociales */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              📱 Compartir en redes sociales
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              
              {/* WhatsApp */}
              <button
                onClick={compartirWhatsApp}
                className="p-4 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-all flex flex-col items-center gap-2 group"
              >
                <svg className="w-8 h-8 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                <span className="font-semibold text-sm">WhatsApp</span>
              </button>

              {/* Facebook */}
              <button
                onClick={compartirFacebook}
                className="p-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all flex flex-col items-center gap-2 group"
              >
                <svg className="w-8 h-8 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                <span className="font-semibold text-sm">Facebook</span>
              </button>

              {/* Twitter */}
              <button
                onClick={compartirTwitter}
                className="p-4 bg-sky-500 text-white rounded-xl hover:bg-sky-600 transition-all flex flex-col items-center gap-2 group"
              >
                <svg className="w-8 h-8 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                </svg>
                <span className="font-semibold text-sm">Twitter</span>
              </button>

              {/* LinkedIn */}
              <button
                onClick={compartirLinkedIn}
                className="p-4 bg-blue-700 text-white rounded-xl hover:bg-blue-800 transition-all flex flex-col items-center gap-2 group"
              >
                <svg className="w-8 h-8 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
                <span className="font-semibold text-sm">LinkedIn</span>
              </button>

              {/* Email */}
              <button
                onClick={compartirEmail}
                className="p-4 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-all flex flex-col items-center gap-2 group"
              >
                <svg className="w-8 h-8 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                <span className="font-semibold text-sm">Email</span>
              </button>

              {/* Copiar link (mobile friendly) */}
              <button
                onClick={copiarLink}
                className="p-4 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition-all flex flex-col items-center gap-2 group"
              >
                <svg className="w-8 h-8 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                </svg>
                <span className="font-semibold text-sm">
                  {copiado ? '✓ Copiado' : 'Link'}
                </span>
              </button>

            </div>
          </div>

          {/* Código QR */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              📷 Código QR
            </label>
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border-2 border-purple-200">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="bg-white p-4 rounded-xl shadow-lg">
                  <img 
                    src={urlQR} 
                    alt="Código QR del anuncio"
                    className="w-48 h-48"
                  />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    Escanea para ver el anuncio
                  </h3>
                  <p className="text-gray-600 mb-4 text-sm">
                    Usa este código QR en material impreso, volantes o presentaciones. 
                    Cualquiera puede escanearlo para ver el anuncio directamente.
                  </p>
                  <button
                    onClick={descargarQR}
                    className="px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-all font-medium inline-flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Descargar QR
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 16v-4"/>
                <path d="M12 8h.01"/>
              </svg>
              <div className="text-sm text-blue-900">
                <p className="font-semibold mb-1">💡 Tips para compartir:</p>
                <ul className="list-disc list-inside space-y-1 text-blue-800">
                  <li>WhatsApp tiene la mayor tasa de respuesta</li>
                  <li>El código QR es perfecto para volantes y presentaciones</li>
                  <li>Comparte en grupos de Facebook de tu zona</li>
                  <li>Agrega el link a tu firma de email</li>
                </ul>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
