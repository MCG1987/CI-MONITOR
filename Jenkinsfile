// CI-MONITOR | Entrega semana 5 - Integracion continua con Jenkins.
// Pensado para Jenkins ejecutado en Windows con PowerShell y Docker Desktop.
// Configurar el trabajo como "Pipeline script from SCM", Git, rama main,
// y ruta del script: Jenkinsfile.
//
// IMPORTANTE: Jenkins normalmente usa localhost:8080. Para evitar un conflicto
// con el puerto 8080 del frontend en docker-compose.yml, el pipeline ejecuta
// el frontend SIN publicar puertos y comprueba la comunicacion desde dentro
// del propio contenedor. No modifica la configuracion de la semana 3.

pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
        skipDefaultCheckout(true)
    }

    stages {
        stage('1. Obtener codigo de GitHub') {
            steps {
                checkout scm
            }
        }

        stage('2. Verificar Docker') {
            steps {
                powershell '''
                    $ErrorActionPreference = 'Stop'

                    docker --version
                    if ($LASTEXITCODE -ne 0) { throw 'Docker no esta disponible.' }

                    docker compose version
                    if ($LASTEXITCODE -ne 0) { throw 'Docker Compose no esta disponible.' }

                    docker info --format '{{.ServerVersion}}'
                    if ($LASTEXITCODE -ne 0) {
                        throw 'Docker Engine no responde. Compruebe Docker Desktop y los permisos del usuario que ejecuta Jenkins.'
                    }
                '''
            }
        }

        stage('3. Construir imagenes') {
            steps {
                powershell '''
                    docker compose -p ci-monitor-jenkins build
                    if ($LASTEXITCODE -ne 0) { throw 'No se pudieron construir las imagenes Docker.' }
                '''
            }
        }

        stage('4. Iniciar contenedores') {
            steps {
                powershell '''
                    $ErrorActionPreference = 'Stop'

                    # El backend queda disponible solo en la red interna Docker.
                    docker compose -p ci-monitor-jenkins up -d backend
                    if ($LASTEXITCODE -ne 0) { throw 'No se pudo iniciar el backend.' }

                    # El frontend se inicia sin publicar el puerto 8080, ocupado
                    # habitualmente por la interfaz de Jenkins.
                    docker compose -p ci-monitor-jenkins run -d --no-deps --name ci-monitor-jenkins-frontend frontend
                    if ($LASTEXITCODE -ne 0) { throw 'No se pudo iniciar el frontend.' }
                '''
            }
        }

        stage('5. Probar comunicacion frontend-backend') {
            steps {
                powershell '''
                    $ErrorActionPreference = 'Stop'

                    # Verificar que Nginx sirve la pagina HTML.
                    $pagina = docker exec ci-monitor-jenkins-frontend wget -qO- http://127.0.0.1/
                    if ($LASTEXITCODE -ne 0 -or ($pagina -join ' ') -notmatch 'CI-Monitor') {
                        throw 'El frontend no entrega la pagina esperada.'
                    }

                    # La peticion pasa por Nginx (/api/) hasta Node.js (backend:3000).
                    # Se realizan varios intentos por si los servicios aun arrancan.
                    $conectado = $false
                    for ($intento = 1; $intento -le 12; $intento++) {
                        $respuesta = docker exec ci-monitor-jenkins-frontend wget -qO- http://127.0.0.1/api/estado 2>$null

                        if ($LASTEXITCODE -eq 0) {
                            try {
                                $datos = ($respuesta -join '') | ConvertFrom-Json
                                if ($datos.estado -eq 'activo') {
                                    $conectado = $true
                                    Write-Host ('Respuesta de la API: ' + $datos.mensaje)
                                    break
                                }
                            } catch {
                                Write-Host 'La API aun no devuelve JSON valido.'
                            }
                        }

                        Start-Sleep -Seconds 2
                    }

                    if (-not $conectado) {
                        throw 'No se pudo verificar la comunicacion entre frontend y backend.'
                    }

                    Write-Host 'PRUEBA EXITOSA: los dos contenedores se comunican.'
                '''
            }
        }
    }

    post {
        always {
            // Limpiar contenedores de esta ejecucion, incluso si alguna prueba falla.
            // returnStatus evita que un error de limpieza o de Docker oculte
            // el resultado original de las pruebas.
            powershell(returnStatus: true, script: '''
                docker rm -f ci-monitor-jenkins-frontend 2>$null | Out-Null
                docker compose -p ci-monitor-jenkins down --remove-orphans
            ''')
        }
        success {
            echo 'CI-MONITOR: compilacion y pruebas de comunicacion completadas.'
        }
        failure {
            echo 'CI-MONITOR: revisar el registro de Jenkins y Docker.'
        }
    }
}
