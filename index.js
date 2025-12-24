class Vector3 {
    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
    
    add(v) {
        return new Vector3(this.x + v.x, this.y + v.y, this.z + v.z);
    }
    
    subtract(v) {
        return new Vector3(this.x - v.x, this.y - v.y, this.z - v.z);
    }
    
    multiply(scalar) {
        return new Vector3(this.x * scalar, this.y * scalar, this.z * scalar);
    }
    
    dot(v) {
        return this.x * v.x + this.y * v.y + this.z * v.z;
    }
    
    cross(v) {
        return new Vector3(
            this.y * v.z - this.z * v.y,
            this.z * v.x - this.x * v.z,
            this.x * v.y - this.y * v.x
        );
    }
    
    length() {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }
    
    normalize() {
        const len = this.length();
        if (len === 0) return new Vector3(0, 0, 0);
        return new Vector3(this.x / len, this.y / len, this.z / len);
    }
    
    distanceTo(v) {
        const dx = this.x - v.x;
        const dy = this.y - v.y;
        const dz = this.z - v.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
}

// Класс для лучей
class Ray {
    constructor(origin, direction) {
        this.origin = origin;
        this.direction = direction.normalize();
    }
    
    pointAt(t) {
        return this.origin.add(this.direction.multiply(t));
    }
}

// Базовый класс для объектов сцены
class SceneObject {
    constructor(position, color) {
        this.position = position;
        this.color = color;
    }
    
    // Метод пересечения луча с объектом
    intersect(ray) {
        return null; // Будет переопределен в подклассах
    }
    
    // Нормаль в точке пересечения
    normalAt(point) {
        return new Vector3(0, 0, 0); // Будет переопределен в подклассах
    }
}

// Класс сферы
class Sphere extends SceneObject {
    constructor(position, radius, color) {
        super(position, color);
        this.radius = radius;
    }
    
    intersect(ray) {
        const oc = ray.origin.subtract(this.position);
        const a = ray.direction.dot(ray.direction);
        const b = 2.0 * oc.dot(ray.direction);
        const c = oc.dot(oc) - this.radius * this.radius;
        const discriminant = b * b - 4 * a * c;
        
        if (discriminant < 0) {
            return null;
        }
        
        const t = (-b - Math.sqrt(discriminant)) / (2.0 * a);
        if (t > 0.001) {
            return t;
        }
        
        const t2 = (-b + Math.sqrt(discriminant)) / (2.0 * a);
        if (t2 > 0.001) {
            return t2;
        }
        
        return null;
    }
    
    normalAt(point) {
        return point.subtract(this.position).normalize();
    }
}

// Класс плоскости
class Plane extends SceneObject {
    constructor(position, normal, color) {
        super(position, color);
        this.normal = normal.normalize();
    }
    
    intersect(ray) {
        const denom = this.normal.dot(ray.direction);
        if (Math.abs(denom) > 0.001) {
            const t = this.position.subtract(ray.origin).dot(this.normal) / denom;
            if (t >= 0.001) {
                return t;
            }
        }
        return null;
    }
    
    normalAt(point) {
        return this.normal;
    }
}

// Класс источника света
class Light {
    constructor(position, intensity) {
        this.position = position;
        this.intensity = intensity;
    }
}

// Класс сцены
class Scene {
    constructor() {
        this.objects = [];
        this.lights = [];
        this.backgroundColor = new Vector3(0.1, 0.1, 0.2);
    }
    
    addObject(object) {
        this.objects.push(object);
    }
    
    addLight(light) {
        this.lights.push(light);
    }
    
    trace(ray, depth = 0, maxDepth = 3) {
        if (depth >= maxDepth) {
            return this.backgroundColor;
        }
        
        let closestIntersection = null;
        let closestObject = null;
        
        // Находим ближайшее пересечение
        for (const object of this.objects) {
            const t = object.intersect(ray);
            if (t !== null && (closestIntersection === null || t < closestIntersection)) {
                closestIntersection = t;
                closestObject = object;
            }
        }
        
        // Если пересечений нет, возвращаем фон
        if (closestIntersection === null) {
            return this.backgroundColor;
        }
        
        // Вычисляем точку пересечения и нормаль
        const intersectionPoint = ray.pointAt(closestIntersection);
        const normal = closestObject.normalAt(intersectionPoint);
        
        // Вычисляем освещение
        let color = new Vector3(0, 0, 0);
        
        for (const light of this.lights) {
            const lightDirection = light.position.subtract(intersectionPoint).normalize();
            
            // Проверяем, не находится ли точка в тени
            const shadowRay = new Ray(intersectionPoint.add(normal.multiply(0.001)), lightDirection);
            let inShadow = false;
            
            for (const obj of this.objects) {
                const shadowT = obj.intersect(shadowRay);
                if (shadowT !== null && shadowT < light.position.distanceTo(intersectionPoint)) {
                    inShadow = true;
                    break;
                }
            }
            
            if (!inShadow) {
                // Диффузное освещение
                const diffuse = Math.max(0, normal.dot(lightDirection));
                const diffuseColor = closestObject.color.multiply(diffuse * light.intensity);
                
                color = color.add(diffuseColor);
            }
            
            // Фоновое освещение (ambient)
            const ambient = 0.2;
            const ambientColor = closestObject.color.multiply(ambient);
            color = color.add(ambientColor);
        }
        
        // Ограничиваем значения цвета
        color.x = Math.min(1, Math.max(0, color.x));
        color.y = Math.min(1, Math.max(0, color.y));
        color.z = Math.min(1, Math.max(0, color.z));
        
        return color;
    }
}

// Класс рендерера
class Renderer {
    constructor(canvas, scene) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.scene = scene;
        this.width = canvas.width;
        this.height = canvas.height;
        this.imageData = this.ctx.createImageData(this.width, this.height);
    }
    
    render() {
        const cameraPosition = new Vector3(0, 2, 10);
        
        // Проходим по всем пикселям
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                // Нормализуем координаты пикселя в диапазон [-1, 1]
                const px = (x / this.width) * 2 - 1;
                const py = -(y / this.height) * 2 + 1;
                
                // Создаем луч из камеры через текущий пиксель
                const rayDirection = new Vector3(px, py, -1).normalize();
                const ray = new Ray(cameraPosition, rayDirection);
                
                // Трассируем луч
                const color = this.scene.trace(ray);
                
                // Преобразуем цвет в значения [0, 255]
                const r = Math.floor(color.x * 255);
                const g = Math.floor(color.y * 255);
                const b = Math.floor(color.z * 255);
                
                // Устанавливаем пиксель
                const index = (y * this.width + x) * 4;
                this.imageData.data[index] = r;
                this.imageData.data[index + 1] = g;
                this.imageData.data[index + 2] = b;
                this.imageData.data[index + 3] = 255; // Альфа-канал
            }
        }
        
        // Отображаем результат на холсте
        this.ctx.putImageData(this.imageData, 0, 0);
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('sceneCanvas');
    const scene = new Scene();
    
    // Создаем объекты сцены
    scene.addObject(new Sphere(new Vector3(0, 0, 0), 2, new Vector3(0.8, 0.2, 0.2))); // Красная сфера
    scene.addObject(new Sphere(new Vector3(4, 1, -1), 1.5, new Vector3(0.2, 0.8, 0.2))); // Зеленая сфера
    scene.addObject(new Sphere(new Vector3(-4, 1, 0), 1.5, new Vector3(0.2, 0.2, 0.8))); // Синяя сфера
    scene.addObject(new Sphere(new Vector3(0, 5, -5), 1, new Vector3(0.8, 0.8, 0.2))); // Желтая сфера
    
    // Создаем плоскости (пол и задняя стенка)
    scene.addObject(new Plane(new Vector3(0, -2, 0), new Vector3(0, 1, 0), new Vector3(0.7, 0.7, 0.7))); // Пол
    scene.addObject(new Plane(new Vector3(0, 0, -10), new Vector3(0, 0, 1), new Vector3(0.5, 0.5, 0.8))); // Задняя стенка
    
    // Создаем источник света
    const light = new Light(new Vector3(2, 5, 2), 1.5);
    scene.addLight(light);
    
    // Создаем рендерер
    const renderer = new Renderer(canvas, scene);
    
    // Функция обновления значений слайдеров
    function updateSliderValues() {
        document.getElementById('lightXValue').textContent = document.getElementById('lightX').value;
        document.getElementById('lightYValue').textContent = document.getElementById('lightY').value;
        document.getElementById('lightZValue').textContent = document.getElementById('lightZ').value;
        document.getElementById('lightIntensityValue').textContent = document.getElementById('lightIntensity').value;
    }
    
    // Функция рендеринга сцены
    function renderScene() {
        // Обновляем позицию и интенсивность источника света
        light.position.x = parseFloat(document.getElementById('lightX').value);
        light.position.y = parseFloat(document.getElementById('lightY').value);
        light.position.z = parseFloat(document.getElementById('lightZ').value);
        light.intensity = parseFloat(document.getElementById('lightIntensity').value);
        
        // Рендерим сцену
        renderer.render();
        
        // Обновляем информацию о положении света
        document.querySelectorAll('.scene-value')[3].textContent = 
            `(${light.position.x.toFixed(1)}, ${light.position.y.toFixed(1)}, ${light.position.z.toFixed(1)})`;
    }
    
    // Инициализация значений слайдеров
    updateSliderValues();
    
    // Первоначальный рендеринг
    renderScene();
    
    // Обработчики событий для слайдеров
    document.getElementById('lightX').addEventListener('input', () => {
        updateSliderValues();

    });
    
    document.getElementById('lightY').addEventListener('input', () => {
        updateSliderValues();

    });
    
    document.getElementById('lightZ').addEventListener('input', () => {
        updateSliderValues();

    });
    
    document.getElementById('lightIntensity').addEventListener('input', () => {
        updateSliderValues();
    });
    
    // Обработчики для кнопок
    document.getElementById('renderBtn').addEventListener('click', renderScene);
    
    document.getElementById('resetBtn').addEventListener('click', () => {
        document.getElementById('lightX').value = 2;
        document.getElementById('lightY').value = 5;
        document.getElementById('lightZ').value = 2;
        document.getElementById('lightIntensity').value = 1.5;
        
        updateSliderValues();
        renderScene();
    });
    
    // Добавляем информацию о количестве объектов в сцене
    document.querySelectorAll('.scene-value')[0].textContent = scene.objects.length;
});