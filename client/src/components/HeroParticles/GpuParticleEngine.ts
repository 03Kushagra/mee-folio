import {
  passthroughFragmentShader,
  renderFragmentShader,
  renderVertexShader,
  simulationVertexShader,
} from "./shaders";

type ParticleState = {
  homePositionBuffer: WebGLBuffer;
  positionBuffer: WebGLBuffer;
  transformFeedback: WebGLTransformFeedback;
  velocityBuffer: WebGLBuffer;
  vertexArray: WebGLVertexArrayObject;
};

type EngineOptions = {
  particleCount: number;
};

const COLOR_A = [0.05, 0.29, 1] as const;
const COLOR_B = [0.54, 0.2, 0.96] as const;
const COLOR_C = [1, 0.2, 0.34] as const;

export class GpuParticleEngine {
  private animationFrameId: number | null = null;
  private aspect = 1;
  private currentStateIndex = 0;
  private destroyed = false;
  private lastFrameTime = 0;
  private pixelRatio = 1;
  private pointer = { x: 0, y: 0 };
  private pointerStrength = 0;
  private pointerTarget = { x: 0, y: 0 };
  private pointerTargetStrength = 0;
  private pointerVelocity = { x: 0, y: 0 };
  private pointerMoving = 0;
  private pointerActivationTime = Number.POSITIVE_INFINITY;
  private attractionCursor = Math.random();
  private lastPointerEventTime: number | null = null;
  private lastPointerMovementTime = Number.NEGATIVE_INFINITY;
  private homePositions = new Float32Array();
  private readonly gl: WebGL2RenderingContext;
  private readonly particleCount: number;
  private readonly renderProgram: WebGLProgram;
  private readonly simulationProgram: WebGLProgram;
  private readonly states: [ParticleState, ParticleState];

  constructor(
    private readonly canvas: HTMLCanvasElement,
    options: EngineOptions,
  ) {
    const gl = canvas.getContext("webgl2", {
      alpha: true,
      antialias: false,
      depth: false,
      powerPreference: "high-performance",
      premultipliedAlpha: true,
      preserveDrawingBuffer: false,
      stencil: false,
    });

    if (!gl) {
      throw new Error("WebGL2 is not available in this browser.");
    }

    this.gl = gl;
    this.particleCount = options.particleCount;
    const initialBounds = canvas.getBoundingClientRect();
    this.aspect =
      initialBounds.height > 0 ? initialBounds.width / initialBounds.height : 1;
    this.simulationProgram = this.createSimulationProgram();
    this.renderProgram = this.createProgram(
      renderVertexShader,
      renderFragmentShader,
    );
    this.states = this.createParticleStates();

    this.configureRenderer();
    this.resize();
    this.drawCurrentState(0);
  }

  start() {
    if (this.animationFrameId !== null || this.destroyed) {
      return;
    }

    this.lastFrameTime = performance.now();
    this.animationFrameId = requestAnimationFrame(this.animate);
  }

  stop() {
    if (this.animationFrameId === null) {
      return;
    }

    cancelAnimationFrame(this.animationFrameId);
    this.animationFrameId = null;
  }

  setPointer(clientX: number, clientY: number) {
    const bounds = this.canvas.getBoundingClientRect();
    const isInside =
      clientX >= bounds.left &&
      clientX <= bounds.right &&
      clientY >= bounds.top &&
      clientY <= bounds.bottom;

    if (!isInside || bounds.width === 0 || bounds.height === 0) {
      this.clearPointer();
      return;
    }

    const nextPointerX =
      ((clientX - bounds.left) / bounds.width * 2 - 1) * this.aspect;
    const nextPointerY =
      -((clientY - bounds.top) / bounds.height * 2 - 1);
    const eventTime = performance.now();

    if (
      this.pointerTargetStrength === 0 ||
      this.lastPointerEventTime === null
    ) {
      this.pointer.x = nextPointerX;
      this.pointer.y = nextPointerY;
      this.pointerVelocity.x = 0;
      this.pointerVelocity.y = 0;
      this.pointerMoving = 0;
      this.pointerActivationTime = eventTime;
    } else {
      const elapsedSeconds = Math.max(
        (eventTime - this.lastPointerEventTime) / 1000,
        1 / 240,
      );
      const deltaX = nextPointerX - this.pointerTarget.x;
      const deltaY = nextPointerY - this.pointerTarget.y;

      if (Math.hypot(deltaX, deltaY) > 0.0005) {
        const velocityBlend = 0.68;

        this.pointerVelocity.x +=
          (deltaX / elapsedSeconds - this.pointerVelocity.x)
          * velocityBlend;
        this.pointerVelocity.y +=
          (deltaY / elapsedSeconds - this.pointerVelocity.y)
          * velocityBlend;
        this.lastPointerMovementTime = eventTime;
      }
    }

    this.pointerTarget.x = nextPointerX;
    this.pointerTarget.y = nextPointerY;
    this.pointerTargetStrength = 1;
    this.lastPointerEventTime = eventTime;
  }

  clearPointer() {
    this.pointerTargetStrength = 0;
    this.pointerMoving = 0;
    this.pointerActivationTime = Number.POSITIVE_INFINITY;
    this.lastPointerEventTime = null;
    this.lastPointerMovementTime = Number.NEGATIVE_INFINITY;
  }

  resize() {
    const bounds = this.canvas.getBoundingClientRect();

    if (bounds.width === 0 || bounds.height === 0) {
      return;
    }

    this.pixelRatio = Math.min(window.devicePixelRatio || 1, 1.75);
    const width = Math.max(1, Math.round(bounds.width * this.pixelRatio));
    const height = Math.max(1, Math.round(bounds.height * this.pixelRatio));

    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }

    this.aspect = bounds.width / bounds.height;
    this.gl.viewport(0, 0, width, height);
    this.drawCurrentState(performance.now() * 0.001);
  }

  destroy() {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.stop();

    for (const state of this.states) {
      this.gl.deleteBuffer(state.homePositionBuffer);
      this.gl.deleteBuffer(state.positionBuffer);
      this.gl.deleteBuffer(state.velocityBuffer);
      this.gl.deleteTransformFeedback(state.transformFeedback);
      this.gl.deleteVertexArray(state.vertexArray);
    }

    this.gl.deleteProgram(this.simulationProgram);
    this.gl.deleteProgram(this.renderProgram);
  }

  private readonly animate = (frameTime: number) => {
    if (this.destroyed) {
      return;
    }

    const delta = Math.min((frameTime - this.lastFrameTime) / 1000, 0.033);
    this.lastFrameTime = frameTime;

    const pointerFollow = 1 - Math.exp(-delta * 54.0);
    const strengthFollow = 1 - Math.exp(-delta * 44.0);

    this.pointer.x +=
      (this.pointerTarget.x - this.pointer.x) * pointerFollow;
    this.pointer.y +=
      (this.pointerTarget.y - this.pointer.y) * pointerFollow;
    this.pointerStrength +=
      (this.pointerTargetStrength - this.pointerStrength) * strengthFollow;

    const pointerHasStopped =
      frameTime - this.lastPointerMovementTime > 70;
    const pointerIsEstablished =
      frameTime - this.pointerActivationTime > 100;

    this.pointerMoving =
      !pointerHasStopped &&
      pointerIsEstablished &&
      this.pointerTargetStrength > 0
        ? 1
        : 0;

    if (pointerHasStopped || this.pointerTargetStrength === 0) {
      const velocityDecay = Math.exp(-delta * 30.0);

      this.pointerVelocity.x *= velocityDecay;
      this.pointerVelocity.y *= velocityDecay;
    }

    if (this.pointerMoving > 0) {
      const pointerSpeed = Math.hypot(
        this.pointerVelocity.x,
        this.pointerVelocity.y,
      );
      const cursorSpeed = 0.16 + Math.min(pointerSpeed, 3.5) * 0.07;

      this.attractionCursor = (this.attractionCursor + delta * cursorSpeed) % 1;
    }

    this.updateParticles(frameTime * 0.001, delta);
    this.drawCurrentState(frameTime * 0.001);

    this.animationFrameId = requestAnimationFrame(this.animate);
  };

  private configureRenderer() {
    this.gl.clearColor(0, 0, 0, 0);
    this.gl.disable(this.gl.DEPTH_TEST);
    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
  }

  private createParticleStates(): [ParticleState, ParticleState] {
    const positions = new Float32Array(this.particleCount * 2);
    const velocities = new Float32Array(this.particleCount * 2);
    const columns = Math.ceil(Math.sqrt(this.particleCount * this.aspect));
    const rows = Math.ceil(this.particleCount / columns);
    const horizontalLimit = this.aspect * 1.08;
    const verticalLimit = 1.08;

    for (let index = 0; index < this.particleCount; index += 1) {
      const offset = index * 2;
      const column = index % columns;
      const row = Math.floor(index / columns);
      const horizontalJitter = (Math.random() - 0.5) * 0.72;
      const verticalJitter = (Math.random() - 0.5) * 0.72;
      const horizontalPosition =
        ((column + 0.5 + horizontalJitter) / columns * 2 - 1) *
        horizontalLimit;
      const verticalPosition =
        ((row + 0.5 + verticalJitter) / rows * 2 - 1) * verticalLimit;
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 0.006;

      positions[offset] = horizontalPosition;
      positions[offset + 1] = verticalPosition;
      velocities[offset] = Math.cos(angle) * speed;
      velocities[offset + 1] = Math.sin(angle) * speed;
    }

    this.homePositions = positions.slice();

    const firstState = this.createParticleState(
      positions,
      velocities,
      positions,
    );
    const secondState = this.createParticleState(
      positions.byteLength,
      velocities.byteLength,
      positions,
    );

    return [firstState, secondState];
  }

  private createParticleState(
    positionData: Float32Array | number,
    velocityData: Float32Array | number,
    homePositionData: Float32Array,
  ): ParticleState {
    const vertexArray = this.gl.createVertexArray();
    const positionBuffer = this.gl.createBuffer();
    const velocityBuffer = this.gl.createBuffer();
    const homePositionBuffer = this.gl.createBuffer();
    const transformFeedback = this.gl.createTransformFeedback();

    if (
      !vertexArray ||
      !positionBuffer ||
      !velocityBuffer ||
      !homePositionBuffer ||
      !transformFeedback
    ) {
      throw new Error("Unable to allocate GPU particle buffers.");
    }

    this.gl.bindVertexArray(vertexArray);

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
    this.uploadBufferData(positionData);
    this.gl.enableVertexAttribArray(0);
    this.gl.vertexAttribPointer(0, 2, this.gl.FLOAT, false, 0, 0);

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, velocityBuffer);
    this.uploadBufferData(velocityData);
    this.gl.enableVertexAttribArray(1);
    this.gl.vertexAttribPointer(1, 2, this.gl.FLOAT, false, 0, 0);

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, homePositionBuffer);
    this.uploadBufferData(homePositionData, this.gl.STATIC_DRAW);
    this.gl.enableVertexAttribArray(2);
    this.gl.vertexAttribPointer(2, 2, this.gl.FLOAT, false, 0, 0);

    this.gl.bindTransformFeedback(this.gl.TRANSFORM_FEEDBACK, transformFeedback);
    this.gl.bindBufferBase(
      this.gl.TRANSFORM_FEEDBACK_BUFFER,
      0,
      positionBuffer,
    );
    this.gl.bindBufferBase(
      this.gl.TRANSFORM_FEEDBACK_BUFFER,
      1,
      velocityBuffer,
    );
    this.gl.bindTransformFeedback(this.gl.TRANSFORM_FEEDBACK, null);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
    this.gl.bindVertexArray(null);

    return {
      homePositionBuffer,
      positionBuffer,
      transformFeedback,
      velocityBuffer,
      vertexArray,
    };
  }

  private uploadBufferData(
    data: Float32Array | number,
    usage: number = this.gl.DYNAMIC_COPY,
  ) {
    if (typeof data === "number") {
      this.gl.bufferData(this.gl.ARRAY_BUFFER, data, usage);
      return;
    }

    this.gl.bufferData(this.gl.ARRAY_BUFFER, data, usage);
  }

  private createSimulationProgram() {
    const vertexShader = this.createShader(
      this.gl.VERTEX_SHADER,
      simulationVertexShader,
    );
    const fragmentShader = this.createShader(
      this.gl.FRAGMENT_SHADER,
      passthroughFragmentShader,
    );
    const program = this.gl.createProgram();

    if (!program) {
      throw new Error("Unable to create the particle simulation program.");
    }

    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.transformFeedbackVaryings(
      program,
      ["vPosition", "vVelocity"],
      this.gl.SEPARATE_ATTRIBS,
    );
    this.gl.linkProgram(program);
    this.assertProgramLinked(program);
    this.gl.deleteShader(vertexShader);
    this.gl.deleteShader(fragmentShader);

    return program;
  }

  private createProgram(vertexSource: string, fragmentSource: string) {
    const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = this.createShader(
      this.gl.FRAGMENT_SHADER,
      fragmentSource,
    );
    const program = this.gl.createProgram();

    if (!program) {
      throw new Error("Unable to create a WebGL program.");
    }

    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);
    this.assertProgramLinked(program);
    this.gl.deleteShader(vertexShader);
    this.gl.deleteShader(fragmentShader);

    return program;
  }

  private createShader(type: number, source: string) {
    const shader = this.gl.createShader(type);

    if (!shader) {
      throw new Error("Unable to create a WebGL shader.");
    }

    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      const details = this.gl.getShaderInfoLog(shader) ?? "Unknown shader error";
      this.gl.deleteShader(shader);
      throw new Error(details);
    }

    return shader;
  }

  private assertProgramLinked(program: WebGLProgram) {
    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      const details =
        this.gl.getProgramInfoLog(program) ?? "Unknown program linking error";
      this.gl.deleteProgram(program);
      throw new Error(details);
    }
  }

  private updateParticles(time: number, delta: number) {
    const sourceState = this.states[this.currentStateIndex];
    const nextStateIndex = this.currentStateIndex === 0 ? 1 : 0;
    const targetState = this.states[nextStateIndex];

    this.gl.useProgram(this.simulationProgram);
    this.setUniform1f(this.simulationProgram, "uAspect", this.aspect);
    this.setUniform1f(this.simulationProgram, "uDelta", delta);
    this.setUniform1f(
      this.simulationProgram,
      "uPointerStrength",
      this.pointerStrength,
    );
    this.setUniform1f(
      this.simulationProgram,
      "uPointerMoving",
      this.pointerMoving,
    );
    this.setUniform1f(
      this.simulationProgram,
      "uAttractionCursor",
      this.attractionCursor,
    );
    this.setUniform1f(
      this.simulationProgram,
      "uAttractionLimitRatio",
      Math.min(1, 100 / this.particleCount),
    );
    this.setUniform1f(this.simulationProgram, "uTime", time);
    this.setUniform2f(
      this.simulationProgram,
      "uPointer",
      this.pointer.x,
      this.pointer.y,
    );
    this.setUniform2f(
      this.simulationProgram,
      "uPointerVelocity",
      this.pointerVelocity.x,
      this.pointerVelocity.y,
    );
    this.gl.bindVertexArray(sourceState.vertexArray);
    this.gl.bindTransformFeedback(
      this.gl.TRANSFORM_FEEDBACK,
      targetState.transformFeedback,
    );
    this.gl.enable(this.gl.RASTERIZER_DISCARD);
    this.gl.beginTransformFeedback(this.gl.POINTS);
    this.gl.drawArrays(this.gl.POINTS, 0, this.particleCount);
    this.gl.endTransformFeedback();
    this.gl.disable(this.gl.RASTERIZER_DISCARD);
    this.gl.bindTransformFeedback(this.gl.TRANSFORM_FEEDBACK, null);
    this.gl.bindVertexArray(null);

    this.currentStateIndex = nextStateIndex;
  }

  private drawCurrentState(time: number) {
    if (this.canvas.width === 0 || this.canvas.height === 0) {
      return;
    }

    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    this.gl.useProgram(this.renderProgram);
    this.setUniform1f(this.renderProgram, "uAspect", this.aspect);
    this.setUniform1f(this.renderProgram, "uPixelRatio", this.pixelRatio);
    this.setUniform1f(this.renderProgram, "uTime", time);
    this.setUniform3f(this.renderProgram, "uColorA", ...COLOR_A);
    this.setUniform3f(this.renderProgram, "uColorB", ...COLOR_B);
    this.setUniform3f(this.renderProgram, "uColorC", ...COLOR_C);

    this.gl.bindVertexArray(this.states[this.currentStateIndex].vertexArray);
    this.gl.drawArrays(this.gl.POINTS, 0, this.particleCount);
    this.gl.bindVertexArray(null);
  }

  private setUniform1f(program: WebGLProgram, name: string, value: number) {
    const location = this.gl.getUniformLocation(program, name);

    if (location) {
      this.gl.uniform1f(location, value);
    }
  }

  private setUniform2f(
    program: WebGLProgram,
    name: string,
    first: number,
    second: number,
  ) {
    const location = this.gl.getUniformLocation(program, name);

    if (location) {
      this.gl.uniform2f(location, first, second);
    }
  }

  private setUniform3f(
    program: WebGLProgram,
    name: string,
    first: number,
    second: number,
    third: number,
  ) {
    const location = this.gl.getUniformLocation(program, name);

    if (location) {
      this.gl.uniform3f(location, first, second, third);
    }
  }
}
