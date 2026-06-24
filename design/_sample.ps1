Add-Type -AssemblyName System.Drawing
$dir = Join-Path $PSScriptRoot 'img'
Get-ChildItem (Join-Path $dir 'chair-*-hires.png') | ForEach-Object {
    $bmp = New-Object System.Drawing.Bitmap($_.FullName)
    $pts = @(
        @(2,2), @([int]($bmp.Width-3),2),
        @(2,[int]($bmp.Height-3)), @([int]($bmp.Width-3),[int]($bmp.Height-3)),
        @([int]($bmp.Width/2),2)
    )
    $out = $_.Name + " ($($bmp.Width)x$($bmp.Height)): "
    foreach ($p in $pts) {
        $c = $bmp.GetPixel($p[0], $p[1])
        $out += ("[{0},{1}]=#{2:X2}{3:X2}{4:X2} " -f $p[0],$p[1],$c.R,$c.G,$c.B)
    }
    Write-Output $out
    $bmp.Dispose()
}
