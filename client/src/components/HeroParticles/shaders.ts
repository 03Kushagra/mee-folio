export const simulationVertexShader = `#version 300 es
precision highp float;

layout(location = 0) in vec2 aPosition;
layout(location = 1) in vec2 aVelocity;
layout(location = 2) in vec2 aHomePosition;

uniform float uAspect;
uniform float uDelta;
uniform float uPointerMoving;
uniform float uPointerStrength;
uniform float uTime;
uniform vec2 uPointer;
uniform vec2 uPointerVelocity;

out vec2 vPosition;
out vec2 vVelocity;

float hash(float value) {
  return fract(sin(value * 91.3458) * 47453.5453);
}

void main() {
  vec2 position = aPosition;
  vec2 velocity = aVelocity;
  vec2 homePosition = aHomePosition;

  float particleId = float(gl_VertexID);
  float phase = hash(particleId) * 6.2831853;

  float ambientSpeed = 0.3 + hash(particleId + 7.0) * 0.16;
  float ambientDirection = hash(particleId + 19.0) > 0.5 ? 1.0 : -1.0;
  float ambientPhase = uTime * ambientSpeed * ambientDirection;
  vec2 ambientOffset = vec2(
    sin(ambientPhase + phase + homePosition.y * 1.8),
    cos(
      ambientPhase * (0.72 + hash(particleId + 31.0) * 0.36)
      + phase
      + homePosition.x * 1.5
    )
  );
  ambientOffset *= vec2(0.016, 0.012);
  vec2 targetPosition = homePosition + ambientOffset;

  vec2 pointerOffset = homePosition - uPointer;
  float pointerDistance = max(length(pointerOffset), 0.001);
  vec2 pointerDirection = pointerOffset / pointerDistance;
  vec2 pointerTangent = vec2(-pointerDirection.y, pointerDirection.x);

  float fieldInfluence = 1.0 - smoothstep(0.04, 0.72, pointerDistance);
  float innerPressure =
    max(0.0, 0.33 - pointerDistance)
    * 1.05
    * fieldInfluence;
  float waveDistance = (pointerDistance - 0.405) / 0.1125;
  float ringWave = exp(-(waveDistance * waveDistance)) * 0.07;
  float particleVariation =
    0.88 + 0.12 * sin(phase + uTime * 0.35);
  float displacement =
    (innerPressure + ringWave)
    * particleVariation
    * uPointerStrength;

  float pointerSpeed = length(uPointerVelocity);
  float movingAmount = uPointerMoving;
  float stationaryAmount = 1.0 - uPointerMoving;
  vec2 gravityOffset = uPointer - position;
  float gravityDistance = max(length(gravityOffset), 0.001);
  vec2 gravityDirection = gravityOffset / gravityDistance;
  float inwardVelocity =
    max(dot(velocity, gravityDirection), 0.0);

  velocity -=
    gravityDirection * inwardVelocity * stationaryAmount;
  targetPosition +=
    pointerDirection * displacement * stationaryAmount;

  float stationaryRepulsion =
    stationaryAmount
    * (1.0 - smoothstep(0.04, 0.72, gravityDistance))
    * uPointerStrength
    * 2.4;
  velocity -=
    gravityDirection * stationaryRepulsion * uDelta;

  float movingGravity =
    movingAmount
    * smoothstep(0.04, 0.7, pointerSpeed)
    * (1.0 - smoothstep(0.12, 0.82, gravityDistance))
    * uPointerStrength;
  float movingGravityForce =
    movingGravity
    * 4.8
    / (0.14 + gravityDistance * gravityDistance * 3.2);
  velocity += gravityDirection * movingGravityForce * uDelta;
  velocity += pointerTangent
    * fieldInfluence
    * uPointerStrength
    * stationaryAmount
    * 0.052
    * uDelta;
  float springStrength = 74.0;
  vec2 springForce = (targetPosition - position) * springStrength;
  float forceLimit = 3.8;
  float springForceLength = length(springForce);

  if (springForceLength > forceLimit) {
    springForce *= forceLimit / springForceLength;
  }

  velocity += springForce * uDelta;

  float damping = 16.0;
  velocity *= exp(-damping * uDelta);
  position += velocity * uDelta;

  vPosition = position;
  vVelocity = velocity;
}
`;

export const passthroughFragmentShader = `#version 300 es
precision highp float;

void main() {
}
`;

export const renderVertexShader = `#version 300 es
precision highp float;

layout(location = 0) in vec2 aPosition;
layout(location = 1) in vec2 aVelocity;

uniform float uAspect;
uniform float uPixelRatio;
uniform float uTime;

out float vColorMix;
out float vSeed;
out vec2 vVelocity;

float hash(float value) {
  return fract(sin(value * 91.3458) * 47453.5453);
}

void main() {
  float particleId = float(gl_VertexID);
  float seed = hash(particleId);
  float pulse = 0.5 + 0.5 * sin(uTime * 0.52 + seed * 10.0);
  float speed = min(length(aVelocity) * 5.5, 1.0);

  gl_Position = vec4(aPosition.x / uAspect, aPosition.y, 0.0, 1.0);
  gl_PointSize = (2.7 + seed * 2.5 + speed * 1.7 + pulse * 0.35)
    * min(uPixelRatio, 1.75);

  vColorMix = clamp(
    aPosition.x / max(uAspect, 0.001) * 0.35 + 0.5 + seed * 0.18,
    0.0,
    1.0
  );
  vSeed = seed;
  vVelocity = aVelocity;
}
`;

export const renderFragmentShader = `#version 300 es
precision highp float;

uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uColorC;

in float vColorMix;
in float vSeed;
in vec2 vVelocity;

out vec4 outputColor;

void main() {
  vec2 point = gl_PointCoord - 0.5;
  float angle = atan(vVelocity.y, vVelocity.x);
  float cosine = cos(angle);
  float sine = sin(angle);
  point = mat2(cosine, sine, -sine, cosine) * point;

  point.x *= 0.56;
  float distanceFromCenter = length(point);
  float alpha = 1.0 - smoothstep(0.3, 0.49, distanceFromCenter);

  if (alpha <= 0.01) {
    discard;
  }

  vec3 firstMix = mix(uColorA, uColorB, smoothstep(0.0, 0.58, vColorMix));
  vec3 color = mix(firstMix, uColorC, smoothstep(0.58, 1.0, vColorMix));
  float opacity = mix(0.58, 0.88, vSeed);

  outputColor = vec4(color, alpha * opacity);
}
`;
