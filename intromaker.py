import ssl

import websockets
import asyncio
import json
import youtube_dl
import os.path
import datetime
import shutil
import subprocess
import shlex

AUDIO_WAVEFORM_PATH = os.path.abspath('audiowaveform')

DOWNLOAD_FOLDER = os.path.join(os.path.abspath(os.path.dirname(__file__)), 'downloads')
if not os.path.exists(DOWNLOAD_FOLDER):
    os.mkdir(DOWNLOAD_FOLDER)


def create_message(message_type, data):
    return {'type': message_type, 'data': data}


def create_error_message(error_message):
    return create_message('error', {'message': error_message})


async def message_handler(websocket, path):
    command = await websocket.recv()
    try:
        command = json.loads(command)
    except json.decoder.JSONDecodeError:
        await websocket.send(json.dumps(create_error_message('Message could not be decoded from JSON')))
        return

    if 'type' not in command or 'data' not in command:
        await websocket.send(json.dumps(create_error_message('Invalid message construct')))
        return

    if command['type'] == 'get_audio':
        await get_audio_from_link(websocket, command['data'])
    elif command['type'] == 'cut_audio':
        await cut_audio_from_link(websocket, command['data'])


async def get_audio_from_link(websocket, data):
    try:
        link = data['link']
    except ValueError:
        await websocket.send(json.dumps(create_error_message('Data is missing fields')))
        return

    temp_folder_name = "{}-{}".format("downloaded", datetime.datetime.now())

    ytdl_opts = {
        'format': 'bestaudio/best',
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192'
        }],
        'outtmpl':  os.path.join(os.path.join(DOWNLOAD_FOLDER, temp_folder_name), '%(title)s.%(ext)s'),
        'default_search': 'auto'
    }

    with youtube_dl.YoutubeDL(ytdl_opts) as ytdl:
        ytdl.download([link])

    # For some reason, ytdl converts ':' to '#' on windows.
    # A special case then has to be made.
    if temp_folder_name not in os.listdir(DOWNLOAD_FOLDER):
        temp_folder_name = temp_folder_name.replace(':', '#')

    temp_folder_path = os.path.join(DOWNLOAD_FOLDER, temp_folder_name)
    file_name = os.listdir(temp_folder_path)[0]
    file_path = os.path.join(temp_folder_path, file_name)
    with open(file_path, 'rb') as f:
        await websocket.send(f.read())

    process = subprocess.Popen(shlex.split('{} -i {} -o {} -z 64 -b 8'.format(shlex.quote(AUDIO_WAVEFORM_PATH),
                                                                              shlex.quote(file_path),
                                                                              shlex.quote(file_path + '.json'))))
    process.wait()
    with open(file_path + '.json', 'r') as f:
        response = {'type': 'audio_data', 'data': {'waveform': json.load(f), 'title': file_name[:-4]}}
        await websocket.send(json.dumps(response))

    shutil.rmtree(temp_folder_path)


async def cut_audio_from_link(websocket, data):
    try:
        link = data['link']
        start_pos = shlex.quote(str(data['start_pos']))
        end_pos = shlex.quote(str(data['end_pos']))
        volume = shlex.quote(str(data['volume']))
    except ValueError:
        await websocket.send(json.dumps(create_error_message('Data is missing fields')))
        return

    temp_folder_name = "{}-{}".format("downloaded", datetime.datetime.now())

    ytdl_opts = {
        'format': 'bestaudio/best',
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192'
        }],
        'outtmpl': os.path.join(os.path.join(DOWNLOAD_FOLDER, temp_folder_name), '%(title)s.%(ext)s'),
        'default_search': 'auto'
    }

    with youtube_dl.YoutubeDL(ytdl_opts) as ytdl:
        ytdl.download([link])

    # For some reason, ytdl converts ':' to '#' on windows.
    # A special case then has to be made.
    if temp_folder_name not in os.listdir(DOWNLOAD_FOLDER):
        temp_folder_name = temp_folder_name.replace(':', '#')

    temp_folder_path = os.path.join(DOWNLOAD_FOLDER, temp_folder_name)
    file_name = os.listdir(temp_folder_path)[0]
    file_path = os.path.join(temp_folder_path, file_name)
    cut_file_path = os.path.join(temp_folder_path, "cut-{}".format(file_name))

    ffmpeg_call = 'ffmpeg -i {} -ss {} -to {} -filter:a "volume={}" {}'.format(shlex.quote(file_path), start_pos,
                                                                               end_pos, volume,
                                                                               shlex.quote(cut_file_path))

    # Cut audio file into desired parts
    process = subprocess.Popen(shlex.split(ffmpeg_call))
    process.wait()
    with open(cut_file_path, 'rb') as f:
        await websocket.send(f.read())

    shutil.rmtree(temp_folder_path)


def start_server():
    ssl_cert = ssl.SSLContext()
    ssl_cert.load_cert_chain("/etc/letsencrypt/live/intro.ohminator.com/fullchain.pem",
                             keyfile="/etc/letsencrypt/live/intro.ohminator.com/privkey.pem")
    server = websockets.serve(message_handler, '0.0.0.0', port=8080, ssl=ssl_cert)
    print("Starting web socket!")
    asyncio.get_event_loop().run_until_complete(server)
    asyncio.get_event_loop().run_forever()


if __name__ == '__main__':
    start_server()
