const w : number = window.innerWidth 
const h : number = window.innerHeight 
const parts : number = 4
const scGap : number = 0.02 / parts  
const strokeFactor : number = 90
const sizeFactor : number = 4.9 
const colors : Array<string> = ["#4CAF50", "#F44336", "#2196F3", "#FFEB3B", "#3F51B5"]
const delay : number = 20
const backColor : string = "#bdbdbd"

class ScaleUtil {

    static maxScale(scale : number, i : number, n : number) : number {
        return Math.max(0, scale - i / n)
    }

    static divideScale(scale : number, i : number, n : number) : number {
        return Math.min(1 / n, ScaleUtil.maxScale(scale, i, n)) * n 
    }

    static sinify(scale : number) : number {
        return Math.sin(scale * Math.PI)
    }
}

class DrawingUtil {

    static drawLine(context : CanvasRenderingContext2D, x1 : number, y1 : number, x2 : number, y2 : number) {
        if (y1 <= y2) {
            return 
        }
        context.beginPath()
        context.moveTo(x1, y1)
        context.lineTo(x2, y2)
        context.stroke()
    }

    static drawMirrorRotLine(context : CanvasRenderingContext2D, i : number, scale : number) {
        const sf : number = ScaleUtil.sinify(scale)
        const sf1 : number = ScaleUtil.divideScale(sf, 0, parts)
        const sf2 : number = ScaleUtil.divideScale(sf, 1, parts)
        const sf3 : number = ScaleUtil.divideScale(sf, 2, parts)
        const size : number = Math.min(w, h) / sizeFactor 
        const width : number = (h / 2) * sf3 
        if (sf1 < 0) {
            return 
        }
        context.save()
        context.scale(1 - 2 * i, 1 - 2 * i)
        context.rotate(sf2 * Math.PI / 2)
        DrawingUtil.drawLine(context, 0, 0, 0, -size * sf1)
        context.fillRect(-width, -size, width, size)
        context.restore()
    }

    static drawMirrorRotLines(context : CanvasRenderingContext2D, scale : number) {
        for (var j = 0; j < 2; j++) {
            DrawingUtil.drawMirrorRotLine(context, j, scale)
        }
    }

    static drawMRLNode(context : CanvasRenderingContext2D, i : number, scale : number) {
        context.lineCap = 'round'
        context.lineWidth = Math.min(w, h) / strokeFactor 
        context.strokeStyle = colors[i]
        context.fillStyle = colors[i]
        context.save()
        context.translate(w / 2, h / 2)
        DrawingUtil.drawMirrorRotLines(context, scale)
        context.restore()
    }
}

class Stage {

    canvas : HTMLCanvasElement = document.createElement('canvas')
    context : CanvasRenderingContext2D 
    renderer : Renderer = new Renderer()

    initCanvas() {
        this.canvas.width = w 
        this.canvas.height = h 
        this.context = this.canvas.getContext('2d')
        document.body.appendChild(this.canvas)
    }

    render() {
        this.context.fillStyle = backColor 
        this.context.fillRect(0, 0, w, h)
        this.renderer.render(this.context)
    }

    handleTap() {
        this.canvas.onmousedown = () => {
            this.renderer.handleTap(() => {
                this.render()
            })
        }
    }

    static init() {
        const stage : Stage = new Stage()
        stage.initCanvas()
        stage.render()
        stage.handleTap()
    }
}

class State {

    scale : number = 0
    dir : number = 0
    prevScale : number = 0

    update(cb : Function) {
        this.scale += scGap * this.dir 
        if (Math.abs(this.scale - this.prevScale) > 1) {
            this.scale = this.prevScale + this.dir 
            this.dir = 0
            this.prevScale = this.scale 
            cb()
        }
    }

    startUpdating(cb : Function) {
        if (this.dir == 0) {
            this.dir = 1 - 2 * this.prevScale 
            cb()
        }
    }
}

class Animator {

    animated : boolean = false 
    interval : number 

    start(cb : Function) {
        if (!this.animated) {
            this.animated = true 
            this.interval = setInterval(cb, delay)
        }
    }

    stop() {
        if (this.animated) {
            this.animated = false 
            clearInterval(this.interval)
        }
    }
}

class MRLNode {

    next : MRLNode 
    prev : MRLNode 
    state : State = new State()

    constructor(private i : number) {
        this.addNeighbor()
    }

    addNeighbor() {
        if (this.i < colors.length - 1) {
            this.next = new MRLNode(this.i + 1)
            this.next.prev = this 
        }
    }

    draw(context : CanvasRenderingContext2D) {
        DrawingUtil.drawMRLNode(context, this.i, this.state.scale)
    }

    update(cb : Function) {
        this.state.update(cb)
    }

    startUpdating(cb : Function) {
        this.state.startUpdating(cb)
    }

    getNext(dir : number, cb : Function) : MRLNode {
        var curr : MRLNode = this.prev 
        if (dir == 1) {
            curr = this.next 
        }
        if (curr) {
            return curr 
        }
        cb()
        return this 
    }
}

class MirrorRotLine {

    curr : MRLNode = new MRLNode(0)
    dir : number = 1

    draw(context : CanvasRenderingContext2D) {
        this.curr.draw(context)
    }

    update(cb : Function) {
        this.curr.update(() => {
            this.curr = this.curr.getNext(this.dir, () => {
                this.dir *= -1
            })
            cb()
        })
    }

    startUpdating(cb : Function) {
        this.curr.startUpdating(cb)
    }
}

class Renderer {

    animator : Animator = new Animator()
    mrl : MirrorRotLine = new MirrorRotLine()

    render(context : CanvasRenderingContext2D) {
        this.mrl.draw(context)
    }

    handleTap(cb : Function) {
        this.mrl.startUpdating(() => {
            this.animator.start(() => {
                cb()
                this.mrl.update(() => {
                    this.animator.stop()
                    cb()
                })
            })
        })
    }
}