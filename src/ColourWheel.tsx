import React from 'react';
import { ColourModel, JChModel } from './ColourModels';

export type ColourWheelProps = {
  size?: number;
  slices?: number;
  rings?: number;
  model?: ColourModel;
  aMin?: number;
  aMax?: number;
  bMin?: number;
  bMax?: number;
}

const DEFAULT_SIZE = 300;

export class ColourWheel extends React.Component<ColourWheelProps> {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  constructor(props: ColourWheelProps) {
    super(props);
    this.canvasRef = React.createRef();
  }
  componentDidMount(): void {
    const canvas = this.canvasRef.current;
    if(!canvas) return;
    const ctx = canvas.getContext("2d");
    if(!ctx) return;
    // ctx.reset();
    console.log("Redrawing canvas");
    console.trace();
    this.redrawCanvas(ctx);
  }
  componentDidUpdate(prevProps: Readonly<ColourWheelProps>, prevState: Readonly<{}>, snapshot?: any): void {
    const canvas = this.canvasRef.current;
    if(!canvas) return;
    const ctx = canvas.getContext("2d");
    if(!ctx) return;
    this.redrawCanvas(ctx);
  }
  redrawCanvas(ctx: CanvasRenderingContext2D): void {
    const {
      size = DEFAULT_SIZE,
      slices = 60,
      rings = 10,
      model = JChModel,
      aMin = 0,
      aMax = 100,
      bMin = 0,
      bMax = 100
    } = this.props;
    ctx.resetTransform();
    ctx.clearRect(0, 0, size, size);
    ctx.translate(size/2, size/2);
    ctx.scale(1, -1);
    ctx.rotate(Math.PI/6);
    const sliceAngle = 360 / slices;
    const radius = size/2;
    const ringRadius = radius/rings;

    const angleOverlap = 0.007;
    const radiusOverlap = 0.5;

    for(var slice = 0; slice < slices; slice++) {
      // Whether we were previously in-gamut in this slice, or null if unknown (ie first ring)
      var sliceInGamut: boolean | null = null;
      for(var ring=0; ring < rings; ring++) {
        
        var startAngle = (((slice - 0.5) * sliceAngle) * Math.PI / 180) - angleOverlap;
        var endAngle = (((slice + 0.5) * sliceAngle) * Math.PI / 180) + angleOverlap;
        var startRadius = Math.max(0, ring * ringRadius - radiusOverlap);
        var endRadius = (ring + 1) * ringRadius;
        
        // Angle goes [0, 1) but distance goes (0, 1] because we always want to at least draw the maximum chroma/brightness/value at the outside
        var result = model.generateRGB(slice/slices, (ring + 1)/rings, aMin, aMax, bMin, bMax)
        ctx.fillStyle = result.sRGB;
        
        ctx.beginPath();
        ctx.arc(0, 0, startRadius, startAngle, endAngle);
        // Draw a gamut border if the in-gamut has changed (and wasn't previously null for 'unknown')
        if(result.inGamut !== sliceInGamut) ctx.stroke();
        ctx.arc(0, 0, endRadius, endAngle, startAngle, true);
        ctx.closePath();
        ctx.fill();
        sliceInGamut = result.inGamut;
      }
    }
  }



  render() {
    const {size = DEFAULT_SIZE} = this.props;
    return(
      <canvas ref={this.canvasRef} width={size} height={size} />
    )
  }
}
