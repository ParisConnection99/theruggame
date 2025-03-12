// custom-head.jsx (place this in your app directory)
export default function CustomHead() {
    return (
      <>
        {/* Primary title */}
        <meta property="og:title" content="The Rug Game" />
        
        {/* Secondary title (will be used if OG fails) */}
        <title>The Rug Game</title>
        
        {/* Primary icon */}
        <link rel="icon" href="/favicon.ico" />
        
        {/* Secondary icon options */}
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        
        {/* Other important meta tags */}
        <meta property="og:image" content="https://theruggame.fun/images/logo1.png" />
        <meta property="og:description" content="Guess pump or rug correctly & win Big!" />
        <meta property="og:url" content="https://theruggame.fun/" />
      </>
    )
  }