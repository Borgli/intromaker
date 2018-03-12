import websockets
import asyncio
import json
import youtube_dl
import os.path
import datetime
import shutil
import subprocess
import shlex

AUDIO_WAVEFORM_PATH = '/home/rune/Downloads/audiowaveform-1.1.0/build/audiowaveform'

DOWNLOAD_FOLDER = '{}/downloads'.format(os.path.dirname(__file__))
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
    link = data['link']

    temp_folder_name = "{}-{}".format("downloaded", datetime.datetime.now())

    ytdl_opts = {
        'format': 'bestaudio/best',
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192'
        }],
        'outtmpl':  '{}/{}/%(title)s.%(ext)s'.format(DOWNLOAD_FOLDER, temp_folder_name),
        'default_search': 'auto'
    }

    with youtube_dl.YoutubeDL(ytdl_opts) as ytdl:
        ytdl.download([link])

    temp_folder_path = "{}/{}".format(DOWNLOAD_FOLDER, temp_folder_name)
    file_name = os.listdir(temp_folder_path)[0]
    file_path = "{}/{}".format(temp_folder_path, file_name)
    with open(file_path, 'rb') as f:
        await websocket.send(f.read())

    process = subprocess.Popen(shlex.split('{} -i {} -o {} -b 8'.format(AUDIO_WAVEFORM_PATH, shlex.quote(file_path),
                                                                        shlex.quote(file_path + '.json'))))
    process.wait()
    with open(file_path + '.json', 'r') as f:
        waveform_dict = json.load(f)
        response = {'type': 'audio_data', 'data': {'waveform': waveform_dict, 'title': file_name[:-4]}}
        await websocket.send(json.dumps(response))

    shutil.rmtree(temp_folder_path)


async def cut_audio_from_link(websocket, data):
    link = data['link']
    start_pos = shlex.quote(data['start_pos'])
    end_pos = shlex.quote(data['end_pos'])

    temp_folder_name = "{}-{}".format("downloaded", datetime.datetime.now())

    ytdl_opts = {
        'format': 'bestaudio/best',
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192'
        }],
        'outtmpl': '{}/{}/%(title)s.%(ext)s'.format(DOWNLOAD_FOLDER, temp_folder_name)
    }

    with youtube_dl.YoutubeDL(ytdl_opts) as ytdl:
        ytdl.download([link])

    temp_folder_path = "{}/{}".format(DOWNLOAD_FOLDER, temp_folder_name)
    file_name = os.listdir(temp_folder_path)[0]
    file_path = "{}/{}".format(temp_folder_path, file_name)
    cut_file_path = "{}/cut-{}".format(temp_folder_path, file_name)

    # Cut audio file into desired parts
    process = subprocess.Popen(shlex.split('ffmpeg -i {} -ss {} -to {} {}'.format(shlex.quote(file_path), start_pos,
                                                                                  end_pos, shlex.quote(cut_file_path))))
    process.wait()
    with open(cut_file_path, 'rb') as f:
        await websocket.send(f.read())

    shutil.rmtree(temp_folder_path)


def start_server():
    server = websockets.serve(message_handler, '127.0.0.1', 5678)
    print("Starting web socket!")
    asyncio.get_event_loop().run_until_complete(server)
    asyncio.get_event_loop().run_forever()


if __name__ == '__main__':
    start_server()
