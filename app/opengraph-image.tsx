import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = 'PomoUno - Free Online Pomodoro Timer'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#ffffff',
          //backgroundImage: 'linear-gradient(45deg, #f3f4f6 25%, transparent 25%), linear-gradient(-45deg, #f3f4f6 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f3f4f6 75%), linear-gradient(-45deg, transparent 75%, #f3f4f6 75%)',
          backgroundSize: '40px 40px',
          backgroundPosition: '0 0, 0 20px, 20px -20px, -20px 0px',
        }}
      >
        {/* Pomodoro Timer Circle */}
        <div
          style={{
            width: 200,
            height: 200,
            borderRadius: '50%',
            backgroundColor: '#E53935',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 40,
            boxShadow: '0 20px 40px rgba(229, 57, 53, 0.3)',
          }}
        >
          <div
            style={{
              width: 140,
              height: 140,
              borderRadius: '50%',
              backgroundColor: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 36,
              fontWeight: 'bold',
              color: '#E53935',
            }}
          >
            25:00
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 64,
            fontWeight: 'bold',
            color: '#1f2937',
            marginBottom: 20,
            textAlign: 'center',
          }}
        >
          PomoUno
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 32,
            color: '#6b7280',
            textAlign: 'center',
            maxWidth: 800,
          }}
        >
          Free Online Pomodoro Timer for Focus & Productivity
        </div>

        {/* Features */}
        <div
          style={{
            display: 'flex',
            marginTop: 40,
            gap: 40,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              color: '#4b5563',
              fontSize: 20,
            }}
          >
            ⚡ Fast & Free
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              color: '#4b5563',
              fontSize: 20,
            }}
          >
            📱 Works Everywhere
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              color: '#4b5563',
              fontSize: 20,
            }}
          >
            📊 Track Progress
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
} 