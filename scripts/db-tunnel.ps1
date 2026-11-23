param(
    [int]$LocalPort = 13307
)

# Keep this terminal open while using the database. SSH prompts for its password.
& ssh -N -T `
    -o StrictHostKeyChecking=accept-new `
    -o ExitOnForwardFailure=yes `
    -o ServerAliveInterval=30 `
    -o ServerAliveCountMax=3 `
    -L "127.0.0.1:${LocalPort}:localhost:3306" `
    root@155.138.237.10

exit $LASTEXITCODE
