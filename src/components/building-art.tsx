export function BuildingArt({ joined = false }: { joined?: boolean }) {
  return (
    <svg
      className="building-art"
      viewBox="0 0 490 300"
      role="img"
      aria-label={`Illustration of Maple Court, with ${joined ? "six" : "one"} participating households`}
    >
      <defs>
        <pattern
          id="ground"
          width="16"
          height="16"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="1" cy="1" r=".8" fill="#c4cbbd" />
        </pattern>
      </defs>
      <ellipse cx="254" cy="259" rx="188" ry="24" fill="#dfe6d7" />
      <path d="M75 250H434M98 270H410" stroke="#c2cdb9" strokeWidth="1" />
      <path
        d="M140 98 200 69 365 111 305 140Z"
        fill="#e9e7d9"
        stroke="#b4bfaa"
      />
      <path d="M140 98v143l165 35V140Z" fill="#faf9ed" stroke="#b4bfaa" />
      <path d="M305 140v136l60-38V111Z" fill="#d2dcc9" stroke="#b4bfaa" />
      <path
        d="M132 91 200 57 373 103 305 140Z"
        fill="#f9faf2"
        stroke="#99ad94"
      />
      <path d="m155 90 46-22 145 37-43 25Z" fill="#e1e8d9" />
      {[0, 1, 2].flatMap((row) =>
        [0, 1, 2, 3].map((col) => {
          const x = 158 + col * 36;
          const y = 120 + row * 40 + col * 9;
          const active = joined
            ? [0, 2, 5, 7, 9, 10].includes(row * 4 + col)
            : row === 1 && col === 1;
          return (
            <g key={`${row}-${col}`}>
              <path
                d={`M${x} ${y}l21 5v24l-21-5Z`}
                fill={active ? "#e5a877" : "#dce4d4"}
                stroke={active ? "#b87d50" : "#b8c5ae"}
              />
              <path
                d={`M${x + 10} ${y + 3}v23`}
                stroke={active ? "#c68d5e" : "#b8c5ae"}
              />
              {active && (
                <path
                  d={`m${x + 5} ${y + 13} 4 4 8-7`}
                  fill="none"
                  stroke="#7f502d"
                  strokeWidth="1.5"
                />
              )}
            </g>
          );
        }),
      )}
      {[0, 1, 2].flatMap((row) =>
        [0, 1].map((col) => (
          <path
            key={`side-${row}-${col}`}
            d={`m${318 + col * 24} ${148 + row * 37 - col * 14} 13-8v22l-13 8Z`}
            fill="#b8c9ae"
            stroke="#9eb291"
          />
        )),
      )}
      <path d="m228 230 25 5v29l-25-5Z" fill="#52795f" stroke="#31553d" />
      <path d="m241 234v28" stroke="#8da48a" />
      <path
        d="M96 239v-43m-4 19 13-9M395 248v-49"
        stroke="#7e9471"
        strokeWidth="3"
      />
      <circle cx="96" cy="185" r="22" fill="#b4c6a3" />
      <circle cx="82" cy="197" r="17" fill="#c2d0b3" />
      <circle cx="107" cy="202" r="18" fill="#adbf9e" />
      <circle cx="395" cy="187" r="25" fill="#aebf9e" />
      <circle cx="408" cy="200" r="20" fill="#bdccae" />
      <rect
        x="198"
        y="19"
        width="118"
        height="30"
        rx="15"
        fill="white"
        stroke="#d9dfd1"
      />
      <circle cx="216" cy="34" r="4" fill="#d59663" />
      <text
        x="229"
        y="38"
        fontSize="11"
        fontFamily="Arial, sans-serif"
        fill="#445744"
      >
        {joined ? "6 households joined" : "Your building. Together."}
      </text>
    </svg>
  );
}
